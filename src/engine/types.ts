export type LineKind = 'h' | 'v'
export type LineId = string // `${kind}:${r}:${c}`
export type BoxId = string  // `${r}:${c}`
export type PlotId = string // `${r0}:${c0}:${h}:${w}`

export type BotLevel = 'easy' | 'medium' | 'hard'

export interface PlayerSpec {
  id: number
  name: string
  color: string
  kind: 'human' | 'bot'
  botLevel?: BotLevel
}

export interface Plot {
  id: PlotId
  ownerIdx: number
  r0: number
  c0: number
  h: number
  w: number
}

export interface GameState {
  size: number
  players: PlayerSpec[]
  current: number
  scores: number[]
  lines: Set<LineId>
  lineOwner: Map<LineId, number>
  boxOwner: Map<BoxId, number>
  plots: Map<PlotId, Plot>
  status: 'playing' | 'gameover'
  lastCapturedBy: number | null
  lastLineId: LineId | null
}
