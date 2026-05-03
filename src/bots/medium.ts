import { GameState, LineId } from '../engine/types'
import { validMoves } from '../engine/moves'
import { applyMove, analyzeUnclaimedComponents } from '../engine/gameEngine'

const CAPTURE_WEIGHT = 1000

export function mediumBot(
  state: GameState,
  rng: () => number = Math.random,
): LineId | null {
  const moves = validMoves(state)
  if (moves.length === 0) return null

  const cellsBefore = state.boxOwner.size
  let bestScore = -Infinity
  const bestMoves: LineId[] = []

  for (const move of moves) {
    const next = applyMove(state, move)
    const captured = next.boxOwner.size - cellsBefore

    const claimedAfter = new Set(next.boxOwner.keys())
    const components = analyzeUnclaimedComponents(next.size, next.lines, claimedAfter)
    let opponentReachable = 0
    for (const c of components) {
      if (c.missingBoundaryEdges === 1) opponentReachable += c.cells.length
    }

    // If our move keeps the turn (we just captured), the "vulnerable
    // components" are actually opportunities for our extra move, not gifts
    // to the opponent. Don't penalize.
    const stillOurTurn = next.current === state.current
    const giftPenalty = stillOurTurn ? 0 : opponentReachable

    const score = captured * CAPTURE_WEIGHT - giftPenalty

    if (score > bestScore) {
      bestScore = score
      bestMoves.length = 0
      bestMoves.push(move)
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }

  return bestMoves[Math.floor(rng() * bestMoves.length)]
}
