import { GameState, LineId, BotLevel } from '../engine/types'
import { easyBot } from './easy'
import { mediumBot } from './medium'

export function decideMove(state: GameState, level: BotLevel): LineId | null {
  switch (level) {
    case 'medium':
    case 'hard':
      return mediumBot(state)
    case 'easy':
    default:
      return easyBot(state)
  }
}
