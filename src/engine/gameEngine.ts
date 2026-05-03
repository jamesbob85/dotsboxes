import { GameState, LineId, PlayerSpec, Plot, PlotId, BoxId } from './types'
import {
  MAX_PLOT_DIM,
  encodePlot,
  isValidMove,
  plotCells,
  plotInterior,
  plotPerimeter,
} from './moves'

export function initState(size: number, players: PlayerSpec[]): GameState {
  return {
    size,
    players,
    current: 0,
    scores: players.map(() => 0),
    lines: new Set(),
    lineOwner: new Map(),
    boxOwner: new Map(),
    plots: new Map(),
    status: 'playing',
    lastCapturedBy: null,
    lastLineId: null,
  }
}

// All possible plot dimensions, ordered largest area first so the greedy
// scan prefers a 3×3 over its constituent 1×1s when both could be valid.
const PLOT_DIMS: Array<[number, number]> = (() => {
  const dims: Array<[number, number]> = []
  for (let h = 1; h <= MAX_PLOT_DIM; h++) {
    for (let w = 1; w <= MAX_PLOT_DIM; w++) dims.push([h, w])
  }
  dims.sort((a, b) => b[0] * b[1] - a[0] * a[1])
  return dims
})()

function isPlotValid(
  size: number,
  lines: Set<LineId>,
  claimedCells: Set<BoxId>,
  r0: number,
  c0: number,
  h: number,
  w: number,
): boolean {
  if (r0 + h > size || c0 + w > size) return false
  for (const cell of plotCells(r0, c0, h, w)) {
    if (claimedCells.has(cell)) return false
  }
  for (const id of plotPerimeter(r0, c0, h, w)) {
    if (!lines.has(id)) return false
  }
  for (const id of plotInterior(r0, c0, h, w)) {
    if (lines.has(id)) return false
  }
  return true
}

export function applyMove(state: GameState, lineId: LineId): GameState {
  if (state.status !== 'playing') return state
  if (!isValidMove(state, lineId)) return state

  const lines = new Set(state.lines)
  lines.add(lineId)

  const lineOwner = new Map(state.lineOwner)
  lineOwner.set(lineId, state.current)

  const plots = new Map(state.plots)
  const boxOwner = new Map(state.boxOwner)
  const claimedCells = new Set(boxOwner.keys())
  const scores = state.scores.slice()

  let captured = false

  // Greedy largest-first scan. Any rectangular region whose perimeter is
  // fully drawn, has no internal lines, and contains no already-claimed
  // cells becomes a plot owned by the current player. Marking cells as
  // claimed mid-scan prevents 1×1s being claimed inside a captured 2×2.
  for (const [h, w] of PLOT_DIMS) {
    for (let r0 = 0; r0 + h <= state.size; r0++) {
      for (let c0 = 0; c0 + w <= state.size; c0++) {
        if (!isPlotValid(state.size, lines, claimedCells, r0, c0, h, w)) continue
        const id: PlotId = encodePlot(r0, c0, h, w)
        const plot: Plot = { id, ownerIdx: state.current, r0, c0, h, w }
        plots.set(id, plot)
        for (const cell of plotCells(r0, c0, h, w)) {
          boxOwner.set(cell, state.current)
          claimedCells.add(cell)
        }
        scores[state.current] += h * w
        captured = true
      }
    }
  }

  const totalCells = state.size * state.size
  const status: GameState['status'] =
    boxOwner.size === totalCells ? 'gameover' : 'playing'
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
    plots,
    scores,
    current: next,
    status,
    lastCapturedBy: captured ? state.current : null,
    lastLineId: lineId,
  }
}

export function winners(state: GameState): number[] {
  const max = Math.max(...state.scores)
  return state.scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0)
}
