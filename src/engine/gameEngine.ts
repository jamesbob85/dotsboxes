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
import { assetYield, pickBestAsset } from './assets'

export function initState(
  size: number,
  players: PlayerSpec[],
  totalHarvests = Infinity,
): GameState {
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
    harvestsElapsed: 0,
    totalHarvests,
  }
}

const PLOT_DIMS: Array<[number, number]> = (() => {
  const dims: Array<[number, number]> = []
  for (let h = 1; h <= MAX_PLOT_DIM; h++) {
    for (let w = 1; w <= MAX_PLOT_DIM; w++) dims.push([h, w])
  }
  dims.sort((a, b) => b[0] * b[1] - a[0] * a[1])
  return dims
})()

export interface ComponentInfo {
  cells: BoxId[]
  missingBoundaryEdges: number
}

export function analyzeUnclaimedComponents(
  size: number,
  lines: Set<LineId>,
  claimedCells: Set<BoxId>,
): ComponentInfo[] {
  const visited = new Set<BoxId>()
  const results: ComponentInfo[] = []

  for (let r0 = 0; r0 < size; r0++) {
    for (let c0 = 0; c0 < size; c0++) {
      const startId = encodeBox(r0, c0)
      if (claimedCells.has(startId) || visited.has(startId)) continue

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
          if (lines.has(edge)) continue
          visited.add(nid)
          inComponent.add(nid)
          stack.push([nr, nc])
        }
      }

      const boundaryEdges = new Set<LineId>()
      for (const cellId of component) {
        const { r, c } = decodeBox(cellId)
        const checks: Array<{ nr: number; nc: number; edge: LineId }> = [
          { nr: r - 1, nc: c, edge: encodeLine('h', r, c) },
          { nr: r + 1, nc: c, edge: encodeLine('h', r + 1, c) },
          { nr: r, nc: c - 1, edge: encodeLine('v', r, c) },
          { nr: r, nc: c + 1, edge: encodeLine('v', r, c + 1) },
        ]
        for (const { nr, nc, edge } of checks) {
          const inside = nr >= 0 && nr < size && nc >= 0 && nc < size
          if (inside && inComponent.has(encodeBox(nr, nc))) continue
          boundaryEdges.add(edge)
        }
      }

      let missing = 0
      for (const edge of boundaryEdges) if (!lines.has(edge)) missing++

      results.push({ cells: component, missingBoundaryEdges: missing })
    }
  }

  return results
}

function findEnclosedComponents(
  size: number,
  lines: Set<LineId>,
  claimedCells: Set<BoxId>,
): BoxId[][] {
  return analyzeUnclaimedComponents(size, lines, claimedCells)
    .filter((c) => c.missingBoundaryEdges === 0)
    .map((c) => c.cells)
}

// Plot dimensions eligible for auto-merge upgrade (≥2×2). Largest-first so
// a 3×3 vineyard merge wins over its constituent 2×2 pig.
const MERGE_DIMS: Array<[number, number]> = [
  [3, 3],
  [2, 3],
  [3, 2],
  [2, 2],
]

function findPlotIdForCell(
  plots: Map<PlotId, Plot>,
  cellId: BoxId,
): PlotId | null {
  const { r, c } = decodeBox(cellId)
  for (const [id, plot] of plots) {
    if (
      r >= plot.r0 &&
      r < plot.r0 + plot.h &&
      c >= plot.c0 &&
      c < plot.c0 + plot.w
    ) {
      return id
    }
  }
  return null
}

// After a capture, scan for rectangles where every cell is owned by the
// capturing player and every overlapping plot is fully contained in the
// rectangle. If the merged asset's yield exceeds the sum of current
// overlapping yields, replace those plots with one bigger plot. Greedy
// largest-first.
function tryMergePlots(
  size: number,
  plots: Map<PlotId, Plot>,
  boxOwner: Map<BoxId, number>,
  ownerIdx: number,
): { plots: Map<PlotId, Plot>; changed: boolean } {
  const result = new Map(plots)
  let changed = false

  for (const [h, w] of MERGE_DIMS) {
    for (let r0 = 0; r0 + h <= size; r0++) {
      for (let c0 = 0; c0 + w <= size; c0++) {
        const cells = plotCells(r0, c0, h, w)
        if (!cells.every((c) => boxOwner.get(c) === ownerIdx)) continue

        const overlappingIds = new Set<PlotId>()
        for (const c of cells) {
          const id = findPlotIdForCell(result, c)
          if (id) overlappingIds.add(id)
        }

        // Skip degenerate case: rectangle is already exactly one plot of the
        // same shape (no merge needed).
        if (overlappingIds.size === 1) {
          const only = result.get(Array.from(overlappingIds)[0])!
          if (only.r0 === r0 && only.c0 === c0 && only.h === h && only.w === w) {
            continue
          }
        }

        // Every overlapping plot must be fully contained in the rectangle —
        // can't slice an existing plot in half.
        let allContained = true
        for (const id of overlappingIds) {
          const p = result.get(id)!
          if (
            p.r0 < r0 ||
            p.c0 < c0 ||
            p.r0 + p.h > r0 + h ||
            p.c0 + p.w > c0 + w
          ) {
            allContained = false
            break
          }
        }
        if (!allContained) continue

        let currentYield = 0
        for (const id of overlappingIds) {
          const p = result.get(id)!
          currentYield += assetYield(p.asset, p.h, p.w)
        }
        const newAsset = pickBestAsset(h, w)
        const newYield = assetYield(newAsset, h, w)
        if (newYield <= currentYield) continue

        for (const id of overlappingIds) result.delete(id)
        const newId = encodePlot(r0, c0, h, w)
        result.set(newId, {
          id: newId,
          ownerIdx,
          r0,
          c0,
          h,
          w,
          asset: newAsset,
        })
        changed = true
      }
    }
  }

  return { plots: result, changed }
}

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
        plots.push({
          id,
          ownerIdx,
          r0,
          c0,
          h,
          w,
          asset: pickBestAsset(h, w),
        })
        for (const cell of cells) remaining.delete(cell)
      }
    }
  }

  for (const cellId of remaining) {
    const { r, c } = decodeBox(cellId)
    plots.push({
      id: encodePlot(r, c, 1, 1),
      ownerIdx,
      r0: r,
      c0: c,
      h: 1,
      w: 1,
      asset: pickBestAsset(1, 1),
    })
  }

  return plots
}

function computeStatus(
  state: { size: number; harvestsElapsed: number; totalHarvests: number },
  boxOwner: Map<BoxId, number>,
): GameState['status'] {
  const totalCells = state.size * state.size
  if (boxOwner.size === totalCells) return 'gameover'
  if (state.harvestsElapsed >= state.totalHarvests) return 'gameover'
  return 'playing'
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

  // After captures, try to merge same-owner plots into higher-yield assets.
  if (captured) {
    const merged = tryMergePlots(state.size, plots, boxOwner, state.current)
    if (merged.changed) {
      plots.clear()
      for (const [id, p] of merged.plots) plots.set(id, p)
    }
  }

  // Build the post-move state. Status is determined first; if the turn is
  // about to pass to another player (no capture, game still on), we run a
  // harvest tick before advancing the player index. Capturing moves keep the
  // turn AND skip the harvest, so a capture streak doesn't compound with
  // extra harvest ticks.
  let result: GameState = {
    ...state,
    lines,
    lineOwner,
    boxOwner,
    plots,
    scores,
    current: state.current,
    status: computeStatus(state, boxOwner),
    lastCapturedBy: captured ? state.current : null,
    lastLineId: lineId,
  }

  if (!captured && result.status === 'playing') {
    result = tickHarvest(result)
    if (result.status === 'playing') {
      result = {
        ...result,
        current: (state.current + 1) % state.players.length,
      }
    }
  }

  return result
}

export function tickHarvest(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const scores = state.scores.slice()
  for (const plot of state.plots.values()) {
    scores[plot.ownerIdx] += assetYield(plot.asset, plot.h, plot.w)
  }
  const harvestsElapsed = state.harvestsElapsed + 1
  const next = { ...state, scores, harvestsElapsed }
  return { ...next, status: computeStatus(next, state.boxOwner) }
}

export function winners(state: GameState): number[] {
  const max = Math.max(...state.scores)
  return state.scores.map((s, i) => (s === max ? i : -1)).filter((i) => i >= 0)
}
