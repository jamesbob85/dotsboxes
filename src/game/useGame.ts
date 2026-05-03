import { useCallback, useEffect, useState } from 'react'
import { GameState, LineId, PlayerSpec } from '../engine/types'
import { applyMove, initState } from '../engine/gameEngine'
import { decideMove } from '../bots'

const DEFAULT_PLAYERS: PlayerSpec[] = [
  { id: 0, name: 'You', color: '#e8804a', kind: 'human' },
  { id: 1, name: 'Bot', color: '#5e87cb', kind: 'bot', botLevel: 'easy' },
]

const BOT_THINK_MS = 450

export function useGame(size = 6, players: PlayerSpec[] = DEFAULT_PLAYERS) {
  const [state, setState] = useState<GameState>(() => initState(size, players))

  const draw = useCallback((lineId: LineId) => {
    setState((s) => {
      if (s.status !== 'playing') return s
      if (s.players[s.current].kind !== 'human') return s
      return applyMove(s, lineId)
    })
  }, [])

  const reset = useCallback(() => {
    setState(initState(size, players))
  }, [size, players])

  useEffect(() => {
    if (state.status !== 'playing') return
    const cur = state.players[state.current]
    if (cur.kind !== 'bot') return
    const t = setTimeout(() => {
      setState((s) => {
        if (s.status !== 'playing') return s
        const c = s.players[s.current]
        if (c.kind !== 'bot') return s
        const move = decideMove(s, c.botLevel ?? 'easy')
        if (!move) return s
        return applyMove(s, move)
      })
    }, BOT_THINK_MS)
    return () => clearTimeout(t)
  }, [state])

  return { state, draw, reset }
}
