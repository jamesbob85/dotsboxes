import { useMemo } from 'react'
import { GameState } from '../engine/types'
import { decodeBox } from '../engine/moves'
import { boxCenter } from './coords'

interface Props {
  state: GameState
}

export default function Boxes({ state }: Props) {
  const captured = useMemo(() => Array.from(state.boxOwner.entries()), [state.boxOwner])
  return (
    <>
      {captured.map(([id, ownerIdx]) => {
        const { r, c } = decodeBox(id)
        const pos = boxCenter(state.size, r, c)
        const color = state.players[ownerIdx].color
        return (
          <mesh
            key={id}
            position={[pos[0], 0.025, pos[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[0.92, 0.92]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.78}
              roughness={0.85}
            />
          </mesh>
        )
      })}
    </>
  )
}
