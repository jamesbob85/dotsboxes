import { useMemo, useState } from 'react'
import { GameState, LineId } from '../engine/types'
import { decodeLine, encodeLine } from '../engine/moves'
import { hLineCenter, vLineCenter } from './coords'

const LINE_LEN = 0.96
const LINE_THICK = 0.13
const LINE_HEIGHT = 0.09
const LINE_Y = 0.06

const HIT_THICK = 0.35
const HIT_HEIGHT = 0.25

interface Props {
  state: GameState
  onClick: (id: LineId) => void
  isHumanTurn: boolean
  currentColor: string
}

export default function Lines({ state, onClick, isHumanTurn, currentColor }: Props) {
  const drawn = useMemo(() => Array.from(state.lines), [state.lines])
  const undrawn = useMemo(() => {
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
  }, [state.lines, state.size])

  return (
    <>
      {drawn.map((id) => (
        <DrawnLine
          key={id}
          id={id}
          size={state.size}
          color={state.players[state.lineOwner.get(id) ?? 0].color}
        />
      ))}
      {undrawn.map((id) => (
        <UndrawnLine
          key={id}
          id={id}
          size={state.size}
          previewColor={currentColor}
          interactive={isHumanTurn}
          onClick={() => onClick(id)}
        />
      ))}
    </>
  )
}

function DrawnLine({ id, size, color }: { id: LineId; size: number; color: string }) {
  const { kind, r, c } = decodeLine(id)
  const pos = kind === 'h' ? hLineCenter(size, r, c) : vLineCenter(size, r, c)
  const args: [number, number, number] =
    kind === 'h' ? [LINE_LEN, LINE_HEIGHT, LINE_THICK] : [LINE_THICK, LINE_HEIGHT, LINE_LEN]
  return (
    <mesh position={[pos[0], LINE_Y, pos[2]]} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

function UndrawnLine({
  id,
  size,
  previewColor,
  interactive,
  onClick,
}: {
  id: LineId
  size: number
  previewColor: string
  interactive: boolean
  onClick: () => void
}) {
  const { kind, r, c } = decodeLine(id)
  const pos = kind === 'h' ? hLineCenter(size, r, c) : vLineCenter(size, r, c)
  const [hover, setHover] = useState(false)
  const showHover = hover && interactive

  const previewArgs: [number, number, number] =
    kind === 'h' ? [LINE_LEN, LINE_HEIGHT, LINE_THICK] : [LINE_THICK, LINE_HEIGHT, LINE_LEN]
  const hitArgs: [number, number, number] =
    kind === 'h' ? [LINE_LEN, HIT_HEIGHT, HIT_THICK] : [HIT_THICK, HIT_HEIGHT, LINE_LEN]

  return (
    <group position={[pos[0], LINE_Y, pos[2]]}>
      {showHover && (
        <mesh>
          <boxGeometry args={previewArgs} />
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={0.6}
            roughness={0.7}
          />
        </mesh>
      )}
      <mesh
        onPointerOver={(e) => {
          if (!interactive) return
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          if (!interactive) return
          e.stopPropagation()
          onClick()
        }}
        visible={false}
      >
        <boxGeometry args={hitArgs} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}
