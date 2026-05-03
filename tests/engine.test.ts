import { describe, it, expect } from 'vitest'
import { initState, applyMove, winners } from '../src/engine/gameEngine'
import { encodeLine, validMoves, boxSides } from '../src/engine/moves'
import { PlayerSpec } from '../src/engine/types'

const PLAYERS: PlayerSpec[] = [
  { id: 0, name: 'A', color: '#f00', kind: 'human' },
  { id: 1, name: 'B', color: '#00f', kind: 'human' },
]

describe('initState', () => {
  it('creates empty board with correct line count', () => {
    const s = initState(2, PLAYERS)
    expect(s.lines.size).toBe(0)
    expect(s.boxOwner.size).toBe(0)
    expect(s.scores).toEqual([0, 0])
    expect(s.current).toBe(0)
    expect(s.status).toBe('playing')
    // 2x2 grid: horizontal lines = 3 rows × 2 cols = 6, vertical = 2 × 3 = 6, total 12
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
    const after = applyMove(s, encodeLine('h', 99, 99))
    expect(after).toBe(s)
  })

  it('rejects already-drawn line', () => {
    let s = initState(2, PLAYERS)
    const id = encodeLine('h', 0, 0)
    s = applyMove(s, id)
    const before = s
    s = applyMove(s, id)
    expect(s).toBe(before)
  })

  it('completing a 1x1 box captures it and grants extra turn', () => {
    let s = initState(2, PLAYERS)
    // Player 0 draws 3 sides of box (0,0)
    s = applyMove(s, encodeLine('h', 0, 0)) // P0 -> P1
    s = applyMove(s, encodeLine('v', 0, 0)) // P1 -> P0
    s = applyMove(s, encodeLine('v', 0, 1)) // P0 -> P1
    expect(s.current).toBe(1)
    // P1 closes it
    s = applyMove(s, encodeLine('h', 1, 0))
    expect(s.scores).toEqual([0, 1])
    expect(s.boxOwner.size).toBe(1)
    // P1 gets another turn
    expect(s.current).toBe(1)
    expect(s.lastCapturedBy).toBe(1)
  })

  it('a single line can complete two adjacent boxes at once', () => {
    let s = initState(2, PLAYERS)
    // Set up so the middle vertical line v:0:1 completes both boxes (0,0) and (0,1)
    const setup = [
      encodeLine('h', 0, 0), // top of (0,0)
      encodeLine('h', 0, 1), // top of (0,1)
      encodeLine('h', 1, 0), // bottom of (0,0)
      encodeLine('h', 1, 1), // bottom of (0,1)
      encodeLine('v', 0, 0), // left of (0,0)
      encodeLine('v', 0, 2), // right of (0,1)
    ]
    for (const m of setup) s = applyMove(s, m)
    const beforeScores = s.scores.slice()
    const turn = s.current
    s = applyMove(s, encodeLine('v', 0, 1))
    expect(s.scores[turn]).toBe(beforeScores[turn] + 2)
    expect(s.boxOwner.size).toBe(2)
    expect(s.current).toBe(turn) // extra turn
  })

  it('completes a 2x2 game and reports gameover with winner', () => {
    let s = initState(2, PLAYERS)
    while (s.status === 'playing') {
      const moves = validMoves(s)
      s = applyMove(s, moves[0])
    }
    expect(s.status).toBe('gameover')
    expect(s.scores[0] + s.scores[1]).toBe(4) // 2x2 = 4 boxes
    const w = winners(s)
    expect(w.length).toBeGreaterThanOrEqual(1)
  })

  it('after gameover, further moves are no-ops', () => {
    let s = initState(1, PLAYERS)
    while (s.status === 'playing') {
      s = applyMove(s, validMoves(s)[0])
    }
    const before = s
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s).toBe(before)
  })
})

describe('boxSides', () => {
  it('returns 4 unique sides for a box', () => {
    const sides = boxSides(2, 3)
    expect(new Set(sides).size).toBe(4)
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
    s = applyMove(s, encodeLine('h', 0, 0)) // duplicate
    expect(s.lastLineId).toBe(before)
  })
})
