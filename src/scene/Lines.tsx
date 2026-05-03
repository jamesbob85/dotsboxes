import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshBasicMaterial } from 'three'
import { GameState, LineId } from '../engine/types'
import { decodeLine, encodeLine } from '../engine/moves'
import { hLineCenter, vLineCenter } from './coords'

const LINE_LEN = 0.96
const LINE_THICK = 0.14
const LINE_HEIGHT = 0.05
const LINE_Y = 0.025 + LINE_HEIGHT / 2

const HIT_THICK = 0.4
const HIT_HEIGHT = 0.4

const HIGHLIGHT_DURATION_MS = 1500

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
      {state.lastLineId && (
        <LastLineHighlight
          key={state.lastLineId}
          id={state.lastLineId}
          size={state.size}
        />
      )}
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
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  )
}

function LastLineHighlight({ id, size }: { id: LineId; size: number }) {
  const { kind, r, c } = decodeLine(id)
  const pos = kind === 'h' ? hLineCenter(size, r, c) : vLineCenter(size, r, c)
  const ref = useRef<Mesh>(null)
  const start = useRef(performance.now())

  // Slightly oversize the highlight so it reads as a halo around the line.
  const args: [number, number, number] =
    kind === 'h'
      ? [LINE_LEN * 1.04, LINE_HEIGHT + 0.04, LINE_THICK + 0.18]
      : [LINE_THICK + 0.18, LINE_HEIGHT + 0.04, LINE_LEN * 1.04]

  useFrame(() => {
    if (!ref.current) return
    const t = Math.min(1, (performance.now() - start.current) / HIGHLIGHT_DURATION_MS)
    const eased = 1 - Math.pow(t, 2) // ease-in fade
    const mat = ref.current.material as MeshBasicMaterial
    mat.opacity = 0.7 * eased
    if (eased <= 0) ref.current.visible = false
  })

  return (
    <mesh ref={ref} position={[pos[0], LINE_Y, pos[2]]}>
      <boxGeometry args={args} />
      <meshBasicMaterial color={'#ffffff'} transparent opacity={0.7} />
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
    <group position={[pos[0], 0, pos[2]]}>
      {showHover && (
        <mesh position={[0, LINE_Y, 0]}>
          <boxGeometry args={previewArgs} />
          <meshStandardMaterial
            color={previewColor}
            transparent
            opacity={0.55}
            roughness={0.7}
          />
        </mesh>
      )}
      <mesh
        position={[0, HIT_HEIGHT / 2, 0]}
        onPointerOver={(e) => {
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
