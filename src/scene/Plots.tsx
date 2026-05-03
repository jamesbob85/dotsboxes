import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { GameState, Plot } from '../engine/types'
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
    <mesh
      ref={ref}
      position={[center[0], PLOT_Y, center[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0.001, 1, 0.001]}
    >
      <planeGeometry args={dims} />
      <meshBasicMaterial color={color} transparent opacity={0.78} />
    </mesh>
  )
}
