import { GameState, LineId, PlayerSpec } from './types'
import { adjacentBoxes, boxSides, encodeBox, isValidMove } from './moves'

export function initState(size: number, players: PlayerSpec[]): GameState {
  return {
    size,
    players,
    current: 0,
    scores: players.map(() => 0),
    lines: new Set(),
    lineOwner: new Map(),
    boxOwner: new Map(),
    status: 'playing',
    lastCapturedBy: null,
  }
}

export function applyMove(state: GameState, lineId: LineId): GameState {
  if (state.status !== 'playing') return state
  if (!isValidMove(state, lineId)) return state

  const lines = new Set(state.lines)
  lines.add(lineId)

  const lineOwner = new Map(state.lineOwner)
  lineOwner.set(lineId, state.current)

  const boxOwner = new Map(state.boxOwner)
  const scores = state.scores.slice()

  let captured = false
  for (const { r, c } of adjacentBoxes(lineId, state.size)) {
    const id = encodeBox(r, c)
    if (boxOwner.has(id)) continue
    if (boxSides(r, c).every((s) => lines.has(s))) {
      boxOwner.set(id, state.current)
      scores[state.current] += 1
      captured = true
    }
  }

  const totalBoxes = state.size * state.size
  const status: GameState['status'] = boxOwner.size === totalBoxes ? 'gameover' : 'playing'
  const next =
    status === 'gameover'
      ? state.current
      : captured
      ? state.current
      : (state.current + 1) % state.players.length

  return {
    ...state,
    lines,
    lineOwner,
    boxOwner,
    scores,
    current: next,
    status,
    lastCapturedBy: captured ? state.current : null,
  }
}

export function winners(state: GameState): number[] {
  const max = Math.max(...state.scores)
  return state.scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0)
}
