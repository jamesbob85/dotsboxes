// Convert grid coordinates to world coordinates.
// Grid spans size×size cells with (size+1)×(size+1) dots.
// Origin (0,0,0) is the center of the board.

export function dotPos(size: number, r: number, c: number): [number, number, number] {
  const half = size / 2
  return [c - half, 0, r - half]
}

// Horizontal line h:r:c spans from dot (r,c) to dot (r,c+1).
// Center: (c + 0.5 - half, 0, r - half), spans length=1 along x.
export function hLineCenter(size: number, r: number, c: number): [number, number, number] {
  const half = size / 2
  return [c + 0.5 - half, 0, r - half]
}

// Vertical line v:r:c spans from dot (r,c) to dot (r+1,c).
// Center: (c - half, 0, r + 0.5 - half), spans length=1 along z.
export function vLineCenter(size: number, r: number, c: number): [number, number, number] {
  const half = size / 2
  return [c - half, 0, r + 0.5 - half]
}

// Box (r,c) center.
export function boxCenter(size: number, r: number, c: number): [number, number, number] {
  const half = size / 2
  return [c + 0.5 - half, 0, r + 0.5 - half]
}

// Center of a plot at (r0, c0) with size h × w.
export function plotCenter(
  size: number,
  r0: number,
  c0: number,
  h: number,
  w: number,
): [number, number, number] {
  const half = size / 2
  return [c0 + w / 2 - half, 0, r0 + h / 2 - half]
}
