import { GameState, LineId, PlayerSpec, Plot, PlotId, BoxId } from './types'
import {
  MAX_PLOT_DIM,
  decodeBox,
  encodeBox,
  encodeLine,
  encodePlot,
  isValidMove,
  plotCells,
  plotInterior,
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

// Plot dimensions ordered by area, largest first. Greedy decomposition uses
// this order so a 2×2 wins over its constituent 1×1s when both could fit.
const PLOT_DIMS: Array<[number, number]> = (() => {
  const dims: Array<[number, number]> = []
  for (let h = 1; h <= MAX_PLOT_DIM; h++) {
    for (let w = 1; w <= MAX_PLOT_DIM; w++) dims.push([h, w])
  }
  dims.sort((a, b) => b[0] * b[1] - a[0] * a[1])
  return dims
})()

// Find connected components of unclaimed cells, considering drawn lines as
// walls that block adjacency. Returns only components that are fully
// enclosed (every boundary edge with outside / claimed cells / grid edge
// is a drawn line).
function findEnclosedComponents(
  size: number,
  lines: Set<LineId>,
  claimedCells: Set<BoxId>,
): BoxId[][] {
  const visited = new Set<BoxId>()
  const enclosed: BoxId[][] = []

  for (let r0 = 0; r0 < size; r0++) {
    for (let c0 = 0; c0 < size; c0++) {
      const startId = encodeBox(r0, c0)
      if (claimedCells.has(startId) || visited.has(startId)) continue

      // BFS the component.
      const component: BoxId[] = []
      const inComponent = new Set<BoxId>()
      const stack: Array<[number, number]> = [[r0, c0]]
      visited.add(startId)
      inComponent.add(startId)

      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!
        component.push(encodeBox(cr, cc))

        const neighbors: Array<[number, number, LineId]> = [
          [cr - 1, cc, encodeLine('h', cr, cc)],
          [cr + 1, cc, encodeLine('h', cr + 1, cc)],
          [cr, cc - 1, encodeLine('v', cr, cc)],
          [cr, cc + 1, encodeLine('v', cr, cc + 1)],
        ]

        for (const [nr, nc, edge] of neighbors) {
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
          const nid = encodeBox(nr, nc)
          if (claimedCells.has(nid) || visited.has(nid)) continue
          if (lines.has(edge)) continue // wall blocks
          visited.add(nid)
          inComponent.add(nid)
          stack.push([nr, nc])
        }
      }

      // Enclosure check: every edge from a component cell to a non-component
      // neighbor (claimed cell, out-of-bounds, or other component) must be a
      // drawn line. Edges to component cells are internal — they may be
      // drawn (an internal wall) or undrawn, doesn't matter.
      let isEnclosed = true
      checkEnclosure: for (const cellId of component) {
        const { r, c } = decodeBox(cellId)
        const checks: Array<{ nr: number; nc: number; edge: LineId }> = [
          { nr: r - 1, nc: c, edge: encodeLine('h', r, c) },
          { nr: r + 1, nc: c, edge: encodeLine('h', r + 1, c) },
          { nr: r, nc: c - 1, edge: encodeLine('v', r, c) },
          { nr: r, nc: c + 1, edge: encodeLine('v', r, c + 1) },
        ]
        for (const { nr, nc, edge } of checks) {
          const inside = nr >= 0 && nr < size && nc >= 0 && nc < size
          const neighborInComponent =
            inside && inComponent.has(encodeBox(nr, nc))
          if (neighborInComponent) continue
          if (!lines.has(edge)) {
            isEnclosed = false
            break checkEnclosure
          }
        }
      }

      if (isEnclosed) enclosed.push(component)
    }
  }

  return enclosed
}

// Decompose a captured (enclosed) component into rectangular plots, greedy
// largest-first. A rectangle is a valid plot only if all its cells are in
// the component AND no interior lines are drawn. Cells that don't fit any
// larger rectangle become 1×1 plots.
function decomposeToPlots(
  size: number,
  lines: Set<LineId>,
  component: BoxId[],
  ownerIdx: number,
): Plot[] {
  const remaining = new Set(component)
  const plots: Plot[] = []

  for (const [h, w] of PLOT_DIMS) {
    if (h === 1 && w === 1) continue
    for (let r0 = 0; r0 + h <= size; r0++) {
      for (let c0 = 0; c0 + w <= size; c0++) {
        const cells = plotCells(r0, c0, h, w)
        if (!cells.every((c) => remaining.has(c))) continue
        if (plotInterior(r0, c0, h, w).some((id) => lines.has(id))) continue
        const id: PlotId = encodePlot(r0, c0, h, w)
        plots.push({ id, ownerIdx, r0, c0, h, w })
        for (const cell of cells) remaining.delete(cell)
      }
    }
  }

  // Leftover cells become 1×1 plots.
  for (const cellId of remaining) {
    const { r, c } = decodeBox(cellId)
    plots.push({
      id: encodePlot(r, c, 1, 1),
      ownerIdx,
      r0: r,
      c0: c,
      h: 1,
      w: 1,
    })
  }

  return plots
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

  const enclosed = findEnclosedComponents(state.size, lines, claimedCells)
  for (const component of enclosed) {
    for (const cellId of component) {
      boxOwner.set(cellId, state.current)
      claimedCells.add(cellId)
    }
    const newPlots = decomposeToPlots(state.size, lines, component, state.current)
    for (const p of newPlots) plots.set(p.id, p)
    scores[state.current] += component.length
    captured = true
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
