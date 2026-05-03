import { AssetType } from './types'

export const ASSET_EMOJI: Record<AssetType, string> = {
  vineyard: '🍇',
  cow: '🐄',
  pig: '🐷',
  chicken: '🐔',
}

export function pickBestAsset(h: number, w: number): AssetType {
  if (h === 3 && w === 3) return 'vineyard'
  if ((h === 2 && w === 3) || (h === 3 && w === 2)) return 'cow'
  if (h === 2 && w === 2) return 'pig'
  return 'chicken'
}

// Yield per harvest tick.
// Scales linearly with cells for chicken (so a 1×3 chicken plot yields 3,
// matching what three separate 1×1 chickens would produce). Pig/cow/vineyard
// have higher per-cell density, rewarding successful big-plot captures.
export function assetYield(asset: AssetType, h: number, w: number): number {
  switch (asset) {
    case 'vineyard':
      return 24
    case 'cow':
      return 12
    case 'pig':
      return 6
    case 'chicken':
      return h * w
  }
}
