import { GameState, LineId, BoxId, LineKind } from './types'

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

export function isLineInBounds(size: number, id: LineId): boolean {
  const { kind, r, c } = decodeLine(id)
  if (kind === 'h') return r >= 0 && r <= size && c >= 0 && c < size
  return r >= 0 && r < size && c >= 0 && c <= size
}

export function isValidMove(state: GameState, id: LineId): boolean {
  return isLineInBounds(state.size, id) && !state.lines.has(id)
}

export function allLines(size: number): LineId[] {
  const out: LineId[] = []
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) out.push(encodeLine('h', r, c))
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) out.push(encodeLine('v', r, c))
  }
  return out
}

export function validMoves(state: GameState): LineId[] {
  const out: LineId[] = []
  const N = state.size
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      const id = encodeLine('h', r, c)
      if (!state.lines.has(id)) out.push(id)
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      const id = encodeLine('v', r, c)
      if (!state.lines.has(id)) out.push(id)
    }
  }
  return out
}

// Box (r, c) sides: top=h:r:c, bottom=h:r+1:c, left=v:r:c, right=v:r:c+1
export function boxSides(r: number, c: number): LineId[] {
  return [
    encodeLine('h', r, c),
    encodeLine('h', r + 1, c),
    encodeLine('v', r, c),
    encodeLine('v', r, c + 1),
  ]
}

// Boxes adjacent to a given line (1 or 2 of them)
export function adjacentBoxes(id: LineId, size: number): { r: number; c: number }[] {
  const { kind, r, c } = decodeLine(id)
  const out: { r: number; c: number }[] = []
  if (kind === 'h') {
    if (r > 0) out.push({ r: r - 1, c })
    if (r < size) out.push({ r, c })
  } else {
    if (c > 0) out.push({ r, c: c - 1 })
    if (c < size) out.push({ r, c })
  }
  return out
}
