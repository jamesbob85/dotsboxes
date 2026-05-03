import { AssetType } from './types'

export const ASSET_EMOJI: Record<AssetType, string> = {
  vineyard: '🍇',
  cow: '🐄',
  pig: '🐷',
  chicken: '🐔',
}

// Asset tier and yield are determined by cell count, not shape — so a 1×4
// run is the same value as a 2×2 once merged.
//   1–3 cells → chicken, 1 yield per cell
//   4–5 cells → pig, 6 yield
//   6–8 cells → cow, 12 yield
//   9+ cells  → vineyard, 24 yield
export function pickBestAsset(h: number, w: number): AssetType {
  const cells = h * w
  if (cells >= 9) return 'vineyard'
  if (cells >= 6) return 'cow'
  if (cells >= 4) return 'pig'
  return 'chicken'
}

export function assetYield(_asset: AssetType, h: number, w: number): number {
  const cells = h * w
  if (cells >= 9) return 24
  if (cells >= 6) return 12
  if (cells >= 4) return 6
  return cells
}
