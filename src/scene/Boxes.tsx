import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { GameState } from '../engine/types'
import { decodeBox } from '../engine/moves'
import { boxCenter } from './coords'

interface Props {
  state: GameState
}

const POP_DURATION_MS = 220

export default function Boxes({ state }: Props) {
  const captured = useMemo(() => Array.from(state.boxOwner.entries()), [state.boxOwner])
  return (
    <>
      {captured.map(([id, ownerIdx]) => {
        const { r, c } = decodeBox(id)
        const pos = boxCenter(state.size, r, c)
        const color = state.players[ownerIdx].color
        return <CapturedBox key={id} position={[pos[0], 0.015, pos[2]]} color={color} />
      })}
    </>
  )
}

function CapturedBox({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  const ref = useRef<Mesh>(null)
  const startTime = useRef<number>(performance.now())

  useFrame(() => {
    if (!ref.current) return
    const elapsed = performance.now() - startTime.current
    const t = Math.min(1, elapsed / POP_DURATION_MS)
    // Ease-out back: gentle overshoot for a satisfying pop.
    const c1 = 1.4
    const c3 = c1 + 1
    const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    ref.current.scale.set(eased, 1, eased)
  })

  return (
    <mesh
      ref={ref}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0.001, 1, 0.001]}
    >
      <planeGeometry args={[0.94, 0.94]} />
      <meshBasicMaterial color={color} transparent opacity={0.78} />
    </mesh>
  )
}
