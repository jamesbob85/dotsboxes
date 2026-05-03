import { GameState, LineId, BotLevel } from '../engine/types'
import { easyBot } from './easy'

export function decideMove(state: GameState, level: BotLevel): LineId | null {
  switch (level) {
    case 'easy':
    case 'medium':
    case 'hard':
    default:
      return easyBot(state)
  }
}
