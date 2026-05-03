import { describe, it, expect } from 'vitest'
import { initState, applyMove } from '../src/engine/gameEngine'
import { encodeLine, plotPerimeter } from '../src/engine/moves'
import { easyBot } from '../src/bots/easy'
import { mediumBot } from '../src/bots/medium'
import { GameState, PlayerSpec } from '../src/engine/types'

const PLAYERS: PlayerSpec[] = [
  { id: 0, name: 'A', color: '#f00', kind: 'bot', botLevel: 'medium' },
  { id: 1, name: 'B', color: '#00f', kind: 'bot', botLevel: 'easy' },
]

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('mediumBot', () => {
  it('takes an immediate capture when one is available', () => {
    // Set up a 1×1 with 3 sides drawn at (0,0); the medium bot should close it.
    let s: GameState = initState(3, PLAYERS)
    s = applyMove(s, encodeLine('h', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 1))
    // Now h:1:0 closes it. It's bot's turn.
    const move = mediumBot(s, rng(1))
    expect(move).toBe(encodeLine('h', 1, 0))
  })

  it('prefers larger captures when multiple are available', () => {
    let s: GameState = initState(3, PLAYERS)
    // Draw 7 of 8 perimeter lines of a 2×2; closing the 8th captures 4 cells.
    const perim = plotPerimeter(0, 0, 2, 2)
    for (let i = 0; i < perim.length - 1; i++) s = applyMove(s, perim[i])
    // Also set up an unrelated 1×1 capture available.
    // (Set up a 3-sided 1×1 elsewhere on the board.)
    s = applyMove(s, encodeLine('h', 0, 2))
    s = applyMove(s, encodeLine('v', 0, 2))
    s = applyMove(s, encodeLine('v', 0, 3))
    // Bot now has two capture options:
    //   perim[7] closes the 2×2 → 4 cells captured
    //   h:1:2 closes the 1×1 at (0,2) → 1 cell captured
    const move = mediumBot(s, rng(2))
    expect(move).toBe(perim[perim.length - 1])
  })

  it('avoids handing the opponent a free capture when a safe move exists', () => {
    // Construct a board where some moves create a 3-sided cell (gift) and
    // others don't. Verify medium picks a safe move.
    let s: GameState = initState(4, PLAYERS)
    // Draw 2 sides of cell (0,0): top + left. Now the cell has 2 sides.
    s = applyMove(s, encodeLine('h', 0, 0))
    s = applyMove(s, encodeLine('v', 0, 0))
    // Many possible next moves. One bad choice: drawing v:0:1 (right of (0,0))
    // leaves cell (0,0) at 3 sides → opponent captures next turn.
    // Verify the bot does NOT pick v:0:1.
    const move = mediumBot(s, rng(3))
    expect(move).not.toBe(encodeLine('v', 0, 1))
    expect(move).not.toBe(encodeLine('h', 1, 0))
  })

  it('beats easy in head-to-head play more often than not', () => {
    let mediumWins = 0
    let easyWins = 0
    let ties = 0
    for (let i = 0; i < 30; i++) {
      const r = rng(i + 100)
      let s = initState(4, PLAYERS) // medium=0, easy=1
      let safety = 0
      while (s.status === 'playing' && safety++ < 200) {
        const cur = s.players[s.current]
        const move =
          cur.botLevel === 'medium' ? mediumBot(s, r) : easyBot(s, r)
        if (!move) break
        s = applyMove(s, move)
      }
      if (s.scores[0] > s.scores[1]) mediumWins++
      else if (s.scores[1] > s.scores[0]) easyWins++
      else ties++
    }
    // Medium should win clearly more than half. Allow some slack for
    // randomness with a small sample, but it should dominate.
    expect(mediumWins).toBeGreaterThan(easyWins)
    expect(mediumWins).toBeGreaterThan(15) // > 50% over 30 games
  })
})
