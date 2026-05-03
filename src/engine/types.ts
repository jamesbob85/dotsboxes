export type LineKind = 'h' | 'v'
export type LineId = string // `${kind}:${r}:${c}`
export type BoxId = string  // `${r}:${c}`

export type BotLevel = 'easy' | 'medium' | 'hard'

export interface PlayerSpec {
  id: number
  name: string
  color: string
  kind: 'human' | 'bot'
  botLevel?: BotLevel
}

export interface GameState {
  size: number
  players: PlayerSpec[]
  current: number
  scores: number[]
  lines: Set<LineId>
  lineOwner: Map<LineId, number>
  boxOwner: Map<BoxId, number>
  status: 'playing' | 'gameover'
  lastCapturedBy: number | null
}
