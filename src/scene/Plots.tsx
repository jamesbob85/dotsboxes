import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Mesh } from 'three'
import { GameState, Plot } from '../engine/types'
import { ASSET_EMOJI } from '../engine/assets'
import { plotCenter } from './coords'

interface Props {
  state: GameState
}

const POP_DURATION_MS = 240
const PLOT_Y = 0.018

export default function Plots({ state }: Props) {
  const plots = useMemo(() => Array.from(state.plots.values()), [state.plots])
  return (
    <>
      {plots.map((plot) => {
        const color = state.players[plot.ownerIdx].color
        return (
          <CapturedPlot
            key={plot.id}
            plot={plot}
            size={state.size}
            color={color}
          />
        )
      })}
    </>
  )
}

function CapturedPlot({
  plot,
  size,
  color,
}: {
  plot: Plot
  size: number
  color: string
}) {
  const ref = useRef<Mesh>(null)
  const startTime = useRef<number>(performance.now())

  const center = plotCenter(size, plot.r0, plot.c0, plot.h, plot.w)
  const dims: [number, number] = [plot.w - 0.06, plot.h - 0.06]

  // Emoji size scales with plot dimensions; chicken plots tile per-cell
  // since chickens scale by area, while big plots show a single icon.
  const isChicken = plot.asset === 'chicken'
  const emoji = ASSET_EMOJI[plot.asset]

  useFrame(() => {
    if (!ref.current) return
    const elapsed = performance.now() - startTime.current
    const t = Math.min(1, elapsed / POP_DURATION_MS)
    const c1 = 1.4
    const c3 = c1 + 1
    const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    ref.current.scale.set(eased, 1, eased)
  })

  return (
    <group>
      <mesh
        ref={ref}
        position={[center[0], PLOT_Y, center[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.001, 1, 0.001]}
      >
        <planeGeometry args={dims} />
        <meshBasicMaterial color={color} transparent opacity={0.78} />
      </mesh>

      {isChicken
        ? renderChickenTiling(plot, size, emoji)
        : (
          <Html
            position={[center[0], PLOT_Y + 0.05, center[2]]}
            center
            transform={false}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              fontSize: emojiFontSize(plot),
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
            }}
          >
            <span>{emoji}</span>
          </Html>
        )}
    </group>
  )
}

function renderChickenTiling(plot: Plot, size: number, emoji: string) {
  const items: JSX.Element[] = []
  for (let dr = 0; dr < plot.h; dr++) {
    for (let dc = 0; dc < plot.w; dc++) {
      const center = plotCenter(size, plot.r0 + dr, plot.c0 + dc, 1, 1)
      items.push(
        <Html
          key={`${dr}:${dc}`}
          position={[center[0], PLOT_Y + 0.05, center[2]]}
          center
          transform={false}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            fontSize: 22,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
          }}
        >
          <span>{emoji}</span>
        </Html>,
      )
    }
  }
  return <>{items}</>
}

function emojiFontSize(plot: Plot): number {
  const cells = plot.h * plot.w
  if (cells >= 9) return 56 // 3x3 vineyard
  if (cells >= 6) return 44 // 2x3 cow
  if (cells === 4) return 36 // 2x2 pig
  return 24
}
