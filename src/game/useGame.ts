import { useCallback, useEffect, useMemo, useState } from 'react'
import { BotLevel, GameState, LineId, PlayerSpec } from '../engine/types'
import { applyMove, initState, tickHarvest } from '../engine/gameEngine'
import { decideMove } from '../bots'

const BOT_THINK_MS = 450
const HARVEST_INTERVAL_MS = 20_000
const TOTAL_HARVESTS = 6

function makePlayers(botLevel: BotLevel): PlayerSpec[] {
  return [
    { id: 0, name: 'You', color: '#e8804a', kind: 'human' },
    { id: 1, name: 'Bot', color: '#5e87cb', kind: 'bot', botLevel },
  ]
}

export function useGame(size = 6, initialBotLevel: BotLevel = 'medium') {
  const [botLevel, setBotLevel] = useState<BotLevel>(initialBotLevel)
  const players = useMemo(() => makePlayers(botLevel), [botLevel])
  const [state, setState] = useState<GameState>(() =>
    initState(size, players, TOTAL_HARVESTS),
  )
  const [nextHarvestAt, setNextHarvestAt] = useState<number | null>(null)

  const draw = useCallback((lineId: LineId) => {
    setState((s) => {
      if (s.status !== 'playing') return s
      if (s.players[s.current].kind !== 'human') return s
      return applyMove(s, lineId)
    })
  }, [])

  const reset = useCallback(() => {
    setState(initState(size, players, TOTAL_HARVESTS))
  }, [size, players])

  // Reset whenever the bot level changes — different bot is a different game.
  useEffect(() => {
    setState(initState(size, players, TOTAL_HARVESTS))
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

  // Harvest scheduler. Each tick, sum yields to scores and advance the
  // harvest counter. Reschedules itself by depending on harvestsElapsed.
  useEffect(() => {
    if (state.status !== 'playing') {
      setNextHarvestAt(null)
      return
    }
    const target = Date.now() + HARVEST_INTERVAL_MS
    setNextHarvestAt(target)
    const t = setTimeout(() => {
      setState((s) => tickHarvest(s))
    }, HARVEST_INTERVAL_MS)
    return () => clearTimeout(t)
  }, [state.harvestsElapsed, state.status])

  return { state, draw, reset, botLevel, setBotLevel, nextHarvestAt }
}
