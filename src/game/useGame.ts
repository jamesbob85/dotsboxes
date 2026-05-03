import { useCallback, useEffect, useMemo, useState } from 'react'
import { BotLevel, GameState, LineId, PlayerSpec } from '../engine/types'
import { applyMove, initState } from '../engine/gameEngine'
import { decideMove } from '../bots'

const BOT_THINK_MS = 450

function makePlayers(botLevel: BotLevel): PlayerSpec[] {
  return [
    { id: 0, name: 'You', color: '#e8804a', kind: 'human' },
    { id: 1, name: 'Bot', color: '#5e87cb', kind: 'bot', botLevel },
  ]
}

export function useGame(size = 6, initialBotLevel: BotLevel = 'medium') {
  const [botLevel, setBotLevel] = useState<BotLevel>(initialBotLevel)
  const players = useMemo(() => makePlayers(botLevel), [botLevel])
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

  // Reset whenever the bot level changes — different bot is a different game.
  useEffect(() => {
    setState(initState(size, players))
  }, [size, players])

  // Bot driver
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

  return { state, draw, reset, botLevel, setBotLevel }
}
