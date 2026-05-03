import { GameState, LineId } from '../engine/types'
import { validMoves } from '../engine/moves'

export function easyBot(state: GameState, rng: () => number = Math.random): LineId | null {
  const moves = validMoves(state)
  if (moves.length === 0) return null
  return moves[Math.floor(rng() * moves.length)]
}
