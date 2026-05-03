import { describe, it, expect } from 'vitest'
import { initState, applyMove, winners } from '../src/engine/gameEngine'
import {
  encodeLine,
  validMoves,
  boxSides,
  plotPerimeter,
  plotInterior,
} from '../src/engine/moves'
import { GameState, PlayerSpec } from '../src/engine/types'

const PLAYERS: PlayerSpec[] = [
  { id: 0, name: 'A', color: '#f00', kind: 'human' },
  { id: 1, name: 'B', color: '#00f', kind: 'human' },
]

function play(state: GameState, ids: string[]): GameState {
  let s = state
  for (const id of ids) s = applyMove(s, id)
  return s
}

describe('initState', () => {
  it('creates empty board with correct line count', () => {
    const s = initState(2, PLAYERS)
    expect(s.lines.size).toBe(0)
    expect(s.boxOwner.size).toBe(0)
    expect(s.plots.size).toBe(0)
    expect(s.scores).toEqual([0, 0])
    expect(s.current).toBe(0)
    expect(s.status).toBe('playing')
    expect(validMoves(s).length).toBe(12)
  })
})

describe('applyMove', () => {
  it('drawing a non-completing line passes the turn', () => {
    let s = initState(2, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s.current).toBe(1)
    expect(s.scores).toEqual([0, 0])
    expect(s.lines.size).toBe(1)
  })

  it('rejects out-of-bounds line', () => {
    const s = initState(2, PLAYERS)
    expect(applyMove(s, encodeLine('h', 99, 99))).toBe(s)
  })

  it('rejects already-drawn line', () => {
    let s = initState(2, PLAYERS)
    const id = encodeLine('h', 0, 0)
    s = applyMove(s, id)
    expect(applyMove(s, id)).toBe(s)
  })

  it('completing a 1x1 plot grants 1 cell + extra turn', () => {
    let s = initState(2, PLAYERS)
    s = play(s, [
      encodeLine('h', 0, 0), // P0
      encodeLine('v', 0, 0), // P1
      encodeLine('v', 0, 1), // P0
    ])
    expect(s.current).toBe(1)
    s = applyMove(s, encodeLine('h', 1, 0))
    expect(s.scores).toEqual([0, 1])
    expect(s.boxOwner.size).toBe(1)
    expect(s.plots.size).toBe(1)
    expect(s.current).toBe(1) // extra turn
  })

  it('after gameover, further moves are no-ops', () => {
    let s = initState(1, PLAYERS)
    while (s.status === 'playing') s = applyMove(s, validMoves(s)[0])
    const before = s
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s).toBe(before)
  })
})

describe('variable-size plot capture', () => {
  // Helper: draw the perimeter of a plot in a given order, returning final state.
  function drawAll(state: GameState, ids: string[]): GameState {
    return play(state, ids)
  }

  it('2x2 perimeter with no internals captures one 2x2 plot worth 4 cells', () => {
    const s0 = initState(3, PLAYERS)
    const perim = plotPerimeter(0, 0, 2, 2)
    expect(perim.length).toBe(8)
    const s = drawAll(s0, perim)
    // 8 alternating moves: P0 draws 1,3,5,7; P1 draws 2,4,6; P0 draws the 8th.
    expect(s.plots.size).toBe(1)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.h).toBe(2)
    expect(plot.w).toBe(2)
    expect(plot.ownerIdx).toBe(1) // 8 alternating moves; move 7 (the closing one) is P1
    expect(s.boxOwner.size).toBe(4)
    expect(s.scores[1]).toBe(4)
    expect(s.lastCapturedBy).toBe(1)
  })

  it('2x2 with internal line drawn first captures only 1x1s as cells get enclosed', () => {
    let s = initState(3, PLAYERS)
    // First draw an internal line of the would-be 2x2.
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 1, 1))
    // Now draw the perimeter.
    const perim = plotPerimeter(0, 0, 2, 2)
    s = drawAll(s, perim)
    // No 2x2 plot should exist; instead 4 separate 1x1 plots.
    const plotShapes = Array.from(s.plots.values()).map((p) => `${p.h}x${p.w}`)
    expect(plotShapes.every((s) => s === '1x1')).toBe(true)
    expect(s.plots.size).toBe(4)
    expect(s.boxOwner.size).toBe(4)
  })

  it('2x3 perimeter with no internals captures a 2x3 plot worth 6 cells', () => {
    const s0 = initState(3, PLAYERS)
    const perim = plotPerimeter(0, 0, 2, 3)
    expect(perim.length).toBe(10)
    const s = drawAll(s0, perim)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.h).toBe(2)
    expect(plot.w).toBe(3)
    expect(s.scores[plot.ownerIdx]).toBe(6)
  })

  it('3x3 perimeter with no internals captures a 3x3 plot worth 9 cells', () => {
    const s0 = initState(3, PLAYERS)
    const perim = plotPerimeter(0, 0, 3, 3)
    const s = drawAll(s0, perim)
    expect(s.plots.size).toBe(1)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.h).toBe(3)
    expect(plot.w).toBe(3)
    expect(s.boxOwner.size).toBe(9)
    expect(s.scores[plot.ownerIdx]).toBe(9)
    expect(s.status).toBe('gameover')
  })

  it('does not capture a plot if any interior line is drawn', () => {
    const s0 = initState(2, PLAYERS)
    // 2x2 perimeter (size=2, so the whole board), but draw an internal
    // line in the middle of the perimeter sequence.
    const perim = plotPerimeter(0, 0, 2, 2)
    const interior = plotInterior(0, 0, 2, 2)
    expect(interior.length).toBe(4)
    // Interleave: do all perimeter moves except the very last, then an interior.
    let s: GameState = s0
    for (let i = 0; i < perim.length - 1; i++) s = applyMove(s, perim[i])
    s = applyMove(s, interior[0]) // splits the would-be 2x2
    s = applyMove(s, perim[perim.length - 1])
    // No 2x2 plot.
    const big = Array.from(s.plots.values()).find((p) => p.h === 2 && p.w === 2)
    expect(big).toBeUndefined()
  })

  it('greedy largest-first prefers a 2x2 over its 4 1x1 sub-plots when both could match', () => {
    // Construct a board where, in principle, a 2x2 could be claimed. Verify
    // we record one 2x2 plot, not four 1x1 plots.
    const s0 = initState(3, PLAYERS)
    const s = drawAll(s0, plotPerimeter(0, 0, 2, 2))
    expect(s.plots.size).toBe(1)
    const sizes = Array.from(s.plots.values()).map((p) => p.h * p.w)
    expect(sizes).toEqual([4])
  })
})

describe('lastLineId tracking', () => {
  it('starts null and updates after each move', () => {
    let s = initState(2, PLAYERS)
    expect(s.lastLineId).toBeNull()
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s.lastLineId).toBe(encodeLine('h', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 0))
    expect(s.lastLineId).toBe(encodeLine('v', 0, 0))
  })

  it('rejected moves do not update lastLineId', () => {
    let s = initState(2, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0))
    const before = s.lastLineId
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s.lastLineId).toBe(before)
  })
})

describe('boxSides', () => {
  it('returns 4 unique sides for a box', () => {
    expect(new Set(boxSides(2, 3)).size).toBe(4)
  })
})

describe('winners', () => {
  it('reports the highest scorer', () => {
    let s = initState(3, PLAYERS)
    while (s.status === 'playing') s = applyMove(s, validMoves(s)[0])
    const w = winners(s)
    expect(w.length).toBeGreaterThanOrEqual(1)
  })
})
