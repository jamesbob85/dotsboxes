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
