import { GameState, LineId, BoxId, LineKind, PlotId, Plot } from './types'

export const MAX_PLOT_DIM = 3

export function encodeLine(kind: LineKind, r: number, c: number): LineId {
  return `${kind}:${r}:${c}`
}

export function decodeLine(id: LineId): { kind: LineKind; r: number; c: number } {
  const parts = id.split(':')
  return { kind: parts[0] as LineKind, r: +parts[1], c: +parts[2] }
}

export function encodeBox(r: number, c: number): BoxId {
  return `${r}:${c}`
}

export function decodeBox(id: BoxId): { r: number; c: number } {
  const [r, c] = id.split(':').map(Number)
  return { r, c }
}

export function encodePlot(r0: number, c0: number, h: number, w: number): PlotId {
  return `${r0}:${c0}:${h}:${w}`
}

export function isLineInBounds(size: number, id: LineId): boolean {
  const { kind, r, c } = decodeLine(id)
  if (kind === 'h') return r >= 0 && r <= size && c >= 0 && c < size
  return r >= 0 && r < size && c >= 0 && c <= size
}

export function isValidMove(state: GameState, id: LineId): boolean {
  return (
    isLineInBounds(state.size, id) &&
    !state.lines.has(id) &&
    !isInteriorToAnyPlot(state, id)
  )
}

function plotContainingCell(plots: Map<PlotId, Plot>, r: number, c: number): PlotId | null {
  for (const [id, plot] of plots) {
    if (r >= plot.r0 && r < plot.r0 + plot.h && c >= plot.c0 && c < plot.c0 + plot.w) {
      return id
    }
  }
  return null
}

// True when both cells flanking the line are in the same plot — drawing the
// line would split a captured area and is disallowed.
export function isInteriorToAnyPlot(state: GameState, id: LineId): boolean {
  const { kind, r, c } = decodeLine(id)
  let aR: number, aC: number, bR: number, bC: number
  if (kind === 'h') {
    aR = r - 1
    aC = c
    bR = r
    bC = c
  } else {
    aR = r
    aC = c - 1
    bR = r
    bC = c
  }
  if (aR < 0 || bR >= state.size || aC < 0 || bC >= state.size) return false
  const plotA = plotContainingCell(state.plots, aR, aC)
  if (plotA === null) return false
  const plotB = plotContainingCell(state.plots, bR, bC)
  return plotA === plotB
}

export function validMoves(state: GameState): LineId[] {
  const out: LineId[] = []
  const N = state.size
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      const id = encodeLine('h', r, c)
      if (!state.lines.has(id) && !isInteriorToAnyPlot(state, id)) out.push(id)
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      const id = encodeLine('v', r, c)
      if (!state.lines.has(id) && !isInteriorToAnyPlot(state, id)) out.push(id)
    }
  }
  return out
}

export function boxSides(r: number, c: number): LineId[] {
  return [
    encodeLine('h', r, c),
    encodeLine('h', r + 1, c),
    encodeLine('v', r, c),
    encodeLine('v', r, c + 1),
  ]
}

// Lines on the perimeter of a plot at (r0, c0) with height h × width w.
export function plotPerimeter(r0: number, c0: number, h: number, w: number): LineId[] {
  const out: LineId[] = []
  for (let c = c0; c < c0 + w; c++) {
    out.push(encodeLine('h', r0, c))
    out.push(encodeLine('h', r0 + h, c))
  }
  for (let r = r0; r < r0 + h; r++) {
    out.push(encodeLine('v', r, c0))
    out.push(encodeLine('v', r, c0 + w))
  }
  return out
}

// Lines interior to a plot (would split it into smaller regions).
export function plotInterior(r0: number, c0: number, h: number, w: number): LineId[] {
  const out: LineId[] = []
  // horizontal interior dividers (between rows)
  for (let r = r0 + 1; r < r0 + h; r++) {
    for (let c = c0; c < c0 + w; c++) out.push(encodeLine('h', r, c))
  }
  // vertical interior dividers (between cols)
  for (let r = r0; r < r0 + h; r++) {
    for (let c = c0 + 1; c < c0 + w; c++) out.push(encodeLine('v', r, c))
  }
  return out
}

export function plotCells(r0: number, c0: number, h: number, w: number): BoxId[] {
  const out: BoxId[] = []
  for (let r = r0; r < r0 + h; r++) {
    for (let c = c0; c < c0 + w; c++) out.push(encodeBox(r, c))
  }
  return out
}
