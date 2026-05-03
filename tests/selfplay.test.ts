import { describe, it, expect } from 'vitest'
import { initState, applyMove } from '../src/engine/gameEngine'
import { validMoves } from '../src/engine/moves'
import { easyBot } from '../src/bots/easy'
import { PlayerSpec } from '../src/engine/types'

// Seedable RNG (mulberry32) so test failures are reproducible.
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TWO: PlayerSpec[] = [
  { id: 0, name: 'A', color: '#f00', kind: 'bot', botLevel: 'easy' },
  { id: 1, name: 'B', color: '#00f', kind: 'bot', botLevel: 'easy' },
]

const FOUR: PlayerSpec[] = [
  { id: 0, name: 'A', color: '#f00', kind: 'bot', botLevel: 'easy' },
  { id: 1, name: 'B', color: '#0f0', kind: 'bot', botLevel: 'easy' },
  { id: 2, name: 'C', color: '#00f', kind: 'bot', botLevel: 'easy' },
  { id: 3, name: 'D', color: '#ff0', kind: 'bot', botLevel: 'easy' },
]

function playGame(size: number, players: PlayerSpec[], r: () => number) {
  let s = initState(size, players)
  let safety = 0
  const maxSteps = (size + 1) * size * 2 + 5
  while (s.status === 'playing') {
    if (safety++ > maxSteps) throw new Error(`Game did not terminate within ${maxSteps} moves`)
    const move = easyBot(s, r)
    if (!move) throw new Error('Bot returned null while game still playing')
    const before = s
    s = applyMove(s, move)
    if (s === before) throw new Error(`applyMove was a no-op for ${move}`)
  }
  return s
}

describe('self-play (random vs random)', () => {
  it('200 games of 2-player size 5 all terminate with valid scores', () => {
    for (let i = 0; i < 200; i++) {
      const r = rng(i + 1)
      const s = playGame(5, TWO, r)
      const total = s.scores.reduce((a, b) => a + b, 0)
      expect(total).toBe(25)
      expect(s.boxOwner.size).toBe(25)
      expect(s.lines.size).toBe(2 * 5 * (5 + 1))
    }
  })

  it('100 games of 4-player size 4 all terminate with valid scores', () => {
    for (let i = 0; i < 100; i++) {
      const r = rng(i + 1000)
      const s = playGame(4, FOUR, r)
      const total = s.scores.reduce((a, b) => a + b, 0)
      expect(total).toBe(16)
      expect(s.boxOwner.size).toBe(16)
    }
  })

  it('all moves played by bots are valid (sampled)', () => {
    const r = rng(42)
    let s = initState(6, TWO)
    while (s.status === 'playing') {
      const move = easyBot(s, r)!
      const valid = validMoves(s)
      expect(valid).toContain(move)
      s = applyMove(s, move)
    }
  })
})
