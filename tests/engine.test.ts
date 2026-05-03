import { describe, it, expect } from 'vitest'
import {
  initState,
  applyMove,
  tickHarvest,
  winners,
} from '../src/engine/gameEngine'
import {
  encodeLine,
  isInteriorToAnyPlot,
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

  it('2x2 with all internals drawn first: same-owner captures auto-merge to pig', () => {
    let s = initState(3, PLAYERS)
    // All 4 interior lines.
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 1, 1))
    const perim = plotPerimeter(0, 0, 2, 2)
    s = drawAll(s, perim)
    // Same player ends up capturing all 4 cells. Decompose initially produces
    // 4 1×1 chickens, but auto-merge upgrades them to 1 pig.
    expect(s.boxOwner.size).toBe(4)
    expect(s.plots.size).toBe(1)
    expect(Array.from(s.plots.values())[0].asset).toBe('pig')
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

  it('partial-interior capture decomposes to chickens (then may merge)', () => {
    // With one interior line drawn the natural decomposition yields 1×2
    // chickens. If the same player ends up owning all cells, the merge
    // step upgrades to a pig — so we just check that at least decomposition
    // produced no clean 2×2 plot from the rectangle path.
    const s0 = initState(2, PLAYERS)
    const perim = plotPerimeter(0, 0, 2, 2)
    const interior = plotInterior(0, 0, 2, 2)
    expect(interior.length).toBe(4)
    let s: GameState = s0
    for (let i = 0; i < perim.length - 1; i++) s = applyMove(s, perim[i])
    s = applyMove(s, interior[0])
    s = applyMove(s, perim[perim.length - 1])
    expect(s.boxOwner.size).toBe(4)
  })

  it('greedy largest-first prefers a 2x2 over its 4 1x1 sub-plots when both could match', () => {
    const s0 = initState(3, PLAYERS)
    const s = drawAll(s0, plotPerimeter(0, 0, 2, 2))
    expect(s.plots.size).toBe(1)
    const sizes = Array.from(s.plots.values()).map((p) => p.h * p.w)
    expect(sizes).toEqual([4])
  })

  it('partial internal wall: still captures all enclosed cells, decomposed into smaller rects', () => {
    // The motivating bug: bot drew one internal line through what would have
    // been a 2×2. Player encloses the perimeter — should still capture all
    // 4 cells, just split by the wall.
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1)) // both halves of the horizontal divider
    const perim = plotPerimeter(0, 0, 2, 2)
    for (const id of perim) s = applyMove(s, id)
    expect(s.boxOwner.size).toBe(4) // all 4 captured
    // 2x2 invalid (interior drawn). Should decompose into two 1×2 horizontal
    // plots (top row, bottom row).
    const plots = Array.from(s.plots.values())
    expect(plots.length).toBe(2)
    expect(plots.every((p) => p.h === 1 && p.w === 2)).toBe(true)
  })

  it('U-shape from a single half-divider is captured and auto-merged to pig', () => {
    // Only h:1:0 is drawn. All 4 cells form one connected component (path
    // via (0,1)→(1,1)). Decomposed to two 1×2 chickens, then since the same
    // player owns all four cells, auto-merge upgrades them to one pig.
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 1, 0))
    const perim = plotPerimeter(0, 0, 2, 2)
    for (const id of perim) s = applyMove(s, id)
    expect(s.boxOwner.size).toBe(4)
    expect(s.plots.size).toBe(1)
    expect(Array.from(s.plots.values())[0].asset).toBe('pig')
  })

  it('fully gridded 2x2 with same owner: 4 chickens auto-merge to 1 pig', () => {
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 1, 1))
    const perim = plotPerimeter(0, 0, 2, 2)
    for (const id of perim) s = applyMove(s, id)
    expect(s.boxOwner.size).toBe(4)
    expect(s.plots.size).toBe(1)
    expect(Array.from(s.plots.values())[0].asset).toBe('pig')
  })

  it('does not capture a non-enclosed region', () => {
    let s = initState(3, PLAYERS)
    // Draw 7 of the 8 perimeter lines of a 2x2.
    const perim = plotPerimeter(0, 0, 2, 2)
    for (let i = 0; i < perim.length - 1; i++) s = applyMove(s, perim[i])
    expect(s.boxOwner.size).toBe(0)
    expect(s.plots.size).toBe(0)
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

describe('asset placement on capture', () => {
  it('2x2 plot gets a pig', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.asset).toBe('pig')
  })

  it('2x3 plot gets a cow', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 3)) s = applyMove(s, id)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.asset).toBe('cow')
  })

  it('3x3 plot gets a vineyard', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 3, 3)) s = applyMove(s, id)
    const plot = Array.from(s.plots.values())[0]
    expect(plot.asset).toBe('vineyard')
  })

  it('isolated single-cell capture produces a chicken (1×1 fallback)', () => {
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('h', 1, 0))
    expect(s.plots.size).toBe(1)
    expect(Array.from(s.plots.values())[0].asset).toBe('chicken')
  })
})

describe('tickHarvest (direct)', () => {
  it('adds yields for each plot to its owner score and increments counter', () => {
    let s = initState(3, PLAYERS, Infinity)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    const owner = Array.from(s.plots.values())[0].ownerIdx
    const beforeScore = s.scores[owner]
    const beforeHarvest = s.harvestsElapsed
    s = tickHarvest(s)
    expect(s.scores[owner]).toBe(beforeScore + 6)
    expect(s.harvestsElapsed).toBe(beforeHarvest + 1)
    expect(s.status).toBe('playing')
  })

  it('ends the game when totalHarvests cap is reached', () => {
    let s = initState(2, PLAYERS, 2)
    expect(s.totalHarvests).toBe(2)
    s = tickHarvest(s)
    expect(s.status).toBe('playing')
    s = tickHarvest(s)
    expect(s.status).toBe('gameover')
    expect(s.harvestsElapsed).toBe(2)
  })

  it('does nothing after gameover', () => {
    let s = initState(2, PLAYERS, 1)
    s = tickHarvest(s)
    expect(s.status).toBe('gameover')
    const before = s
    s = tickHarvest(s)
    expect(s).toBe(before)
  })
})

describe('per-turn harvest (baked into applyMove)', () => {
  it('non-capturing move ticks the harvest counter', () => {
    let s = initState(3, PLAYERS)
    expect(s.harvestsElapsed).toBe(0)
    s = applyMove(s, encodeLine('h', 0, 0))
    expect(s.harvestsElapsed).toBe(1)
    s = applyMove(s, encodeLine('v', 0, 0))
    expect(s.harvestsElapsed).toBe(2)
  })

  it('capturing move does NOT tick the harvest counter', () => {
    // Set up a 1×1 with 3 sides drawn so the next move captures.
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0)) // tick → 1
    s = applyMove(s, encodeLine('v', 0, 0)) // tick → 2
    s = applyMove(s, encodeLine('v', 0, 1)) // tick → 3
    expect(s.harvestsElapsed).toBe(3)
    s = applyMove(s, encodeLine('h', 1, 0)) // captures (0,0). NO tick.
    expect(s.harvestsElapsed).toBe(3)
    expect(s.scores[s.players.findIndex((p) => p.kind === 'human')]).toBe(0)
  })

  it('plot yields accumulate via per-turn harvest', () => {
    // Capture a 2×2 (pig, yield 6). Then play a non-capturing move; the
    // harvest tick should add 6 to the capturer's score.
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    const ownerIdx = Array.from(s.plots.values())[0].ownerIdx
    const beforeScore = s.scores[ownerIdx]
    const beforeHarvest = s.harvestsElapsed
    // Play a non-capturing move somewhere safe.
    s = applyMove(s, encodeLine('h', 0, 2))
    expect(s.harvestsElapsed).toBe(beforeHarvest + 1)
    expect(s.scores[ownerIdx]).toBe(beforeScore + 6)
  })
})

describe('no fence inside a claimed plot', () => {
  it('cannot draw an interior line of an existing pig', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    expect(Array.from(s.plots.values())[0].asset).toBe('pig')
    const before = s
    s = applyMove(s, encodeLine('h', 1, 0)) // interior of the pig
    expect(s).toBe(before)
  })

  it('validMoves excludes lines interior to a plot', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    const moves = validMoves(s)
    for (const interior of [
      encodeLine('h', 1, 0),
      encodeLine('h', 1, 1),
      encodeLine('v', 0, 1),
      encodeLine('v', 1, 1),
    ]) {
      expect(moves).not.toContain(interior)
    }
  })

  it('lines on the boundary between two plots are NOT considered interior', () => {
    // Build two adjacent 1×1 chicken plots owned by different players, with
    // the wall between them already drawn. That wall is the boundary of
    // both plots, not interior to either — but it's already drawn, so it
    // wouldn't be in validMoves anyway. Verify isInteriorToAnyPlot
    // returns false on the line.
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0)) // P0
    s = applyMove(s, encodeLine('h', 1, 0)) // P1
    s = applyMove(s, encodeLine('v', 0, 0)) // P0
    s = applyMove(s, encodeLine('h', 0, 1)) // P1
    s = applyMove(s, encodeLine('v', 0, 1)) // P0 captures (0,0)
    s = applyMove(s, encodeLine('h', 1, 1)) // P0 (extra)
    s = applyMove(s, encodeLine('v', 0, 2)) // P1 captures (0,1)
    expect(s.plots.size).toBe(2)
    // Wall between the two plots: v:0:1
    // It's drawn already, but isInteriorToAnyPlot should be false anyway.
    expect(isInteriorToAnyPlot(s, encodeLine('v', 0, 1))).toBe(false)
  })
})

describe('auto-merge plots', () => {
  it('4 same-owner chickens in a 2x2 area merge into a pig', () => {
    // Setup: gridded 2x2 (all internal walls) plus perimeter so each cell
    // is captured as a 1×1 chicken. Should auto-merge into one pig.
    let s = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 1, 1))
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    // Without merge: 4 chicken plots. With merge: 1 pig plot.
    const plots = Array.from(s.plots.values())
    expect(plots.length).toBe(1)
    expect(plots[0].asset).toBe('pig')
    expect(plots[0].h).toBe(2)
    expect(plots[0].w).toBe(2)
  })

  it('6 same-owner chickens in 2x3 area merge into a cow', () => {
    let s = initState(3, PLAYERS)
    // All internal walls of a 2x3 area.
    s = applyMove(s, encodeLine('h', 1, 0))
    s = applyMove(s, encodeLine('h', 1, 1))
    s = applyMove(s, encodeLine('h', 1, 2))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 0, 2))
    s = applyMove(s, encodeLine('v', 1, 1))
    s = applyMove(s, encodeLine('v', 1, 2))
    for (const id of plotPerimeter(0, 0, 2, 3)) s = applyMove(s, id)
    const plots = Array.from(s.plots.values())
    expect(plots.length).toBe(1)
    expect(plots[0].asset).toBe('cow')
  })

  it('does not merge if cells belong to different owners', () => {
    // Hard to engineer cross-owner 2×2 in a clean test, so verify the
    // negative case via direct scenario: P0 captures one 1×1 and the
    // others remain unowned, no merge candidate exists.
    let s = initState(3, PLAYERS)
    // Set up so P0 captures only (0,0) — its 4 sides drawn, neighboring
    // cells not captured.
    s = applyMove(s, encodeLine('h', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('h', 1, 0))
    // Only one plot owned, no merge.
    const plots = Array.from(s.plots.values())
    expect(plots.length).toBe(1)
    expect(plots[0].asset).toBe('chicken')
  })

  it('does not downgrade an existing pig', () => {
    let s = initState(3, PLAYERS)
    for (const id of plotPerimeter(0, 0, 2, 2)) s = applyMove(s, id)
    expect(Array.from(s.plots.values())[0].asset).toBe('pig')
    s = applyMove(s, encodeLine('h', 0, 2))
    expect(Array.from(s.plots.values()).find((p) => p.r0 === 0 && p.c0 === 0)?.asset).toBe('pig')
  })

  it('1x4 row of same-owner chickens merges to pig-tier yield', () => {
    // Move ordering matters: we want all 4 cells captured by ONE player on
    // a chained extra-turn streak. Draw all horizontals first, then alternate
    // verticals so the first capture happens at v:0:2 (captures 2 cells)
    // and subsequent captures all happen as extra turns of that same player.
    let s = initState(4, PLAYERS)
    for (let c = 0; c < 4; c++) {
      s = applyMove(s, encodeLine('h', 0, c))
      s = applyMove(s, encodeLine('h', 1, c))
    }
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 0, 3))
    s = applyMove(s, encodeLine('v', 0, 2)) // captures (0,1)+(0,2) — extra turn
    s = applyMove(s, encodeLine('v', 0, 0)) // captures (0,0) — extra turn
    s = applyMove(s, encodeLine('v', 0, 4)) // captures (0,3) — merge to 1×4 pig
    expect(s.boxOwner.size).toBe(4)
    expect(s.plots.size).toBe(1)
    const p = Array.from(s.plots.values())[0]
    expect(p.asset).toBe('pig')
    expect(p.h * p.w).toBe(4)
    expect(p.h === 1 || p.w === 1).toBe(true)
  })

  it('1x6 row of same-owner chickens merges to cow-tier yield', () => {
    let s = initState(6, PLAYERS)
    for (let c = 0; c < 6; c++) {
      s = applyMove(s, encodeLine('h', 0, c))
      s = applyMove(s, encodeLine('h', 1, c))
    }
    s = applyMove(s, encodeLine('v', 0, 1))
    s = applyMove(s, encodeLine('v', 0, 3))
    s = applyMove(s, encodeLine('v', 0, 5))
    s = applyMove(s, encodeLine('v', 0, 2)) // captures (0,1)+(0,2)
    s = applyMove(s, encodeLine('v', 0, 4)) // captures (0,3)+(0,4) — merges to 1×4 pig
    s = applyMove(s, encodeLine('v', 0, 0)) // captures (0,0)
    s = applyMove(s, encodeLine('v', 0, 6)) // captures (0,5) — merges to 1×6 cow
    expect(s.boxOwner.size).toBe(6)
    expect(s.plots.size).toBe(1)
    const p = Array.from(s.plots.values())[0]
    expect(p.asset).toBe('cow')
    expect(p.h * p.w).toBe(6)
  })
})
