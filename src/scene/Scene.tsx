import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import Lines from './Lines'
import Plots from './Plots'
import { GameState, LineId } from '../engine/types'
import { dotPos } from './coords'

const PAPER_COLOR = '#fbf3dc'
const ELEVATION_DEG = 45
const ELEVATION_RAD = (ELEVATION_DEG * Math.PI) / 180

// Stretch the world's depth axis so the board appears square on screen
// despite the camera tilt. screen-y span = world-z * sin(elevation),
// so we pre-multiply world-z by 1/sin(elevation).
const Z_STRETCH = 1 / Math.sin(ELEVATION_RAD)

interface Props {
  state: GameState
  onLineClick: (id: LineId) => void
  isHumanTurn: boolean
  currentColor: string
}

export default function Scene({ state, onLineClick, isHumanTurn, currentColor }: Props) {
  return (
    <>
      <CameraRig size={state.size} />

      <color attach="background" args={[PAPER_COLOR]} />

      <ambientLight intensity={0.7} color={'#ffffff'} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={0.7}
        color={'#ffffff'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />

      <Ground />

      <group scale={[1, 1, Z_STRETCH]}>
        <PaperPad size={state.size} />
        <Plots state={state} />
        <Lines
          state={state}
          onClick={onLineClick}
          isHumanTurn={isHumanTurn}
          currentColor={currentColor}
        />
        <DotGrid size={state.size} />
      </group>
    </>
  )
}

function CameraRig({ size }: { size: number }) {
  const viewport = useThree((s) => s.viewport)
  const camera = useThree((s) => s.camera)

  const zoom = useMemo(() => {
    const target = size + 2
    const min = Math.min(viewport.width, viewport.height)
    return (min / target) * 38
  }, [size, viewport.width, viewport.height])

  const dist = 14
  const camY = dist * Math.sin(ELEVATION_RAD)
  const camZ = dist * Math.cos(ELEVATION_RAD)
  camera.lookAt(0, 0, 0)

  return (
    <OrthographicCamera
      makeDefault
      position={[0, camY, camZ]}
      zoom={zoom}
      near={-50}
      far={50}
    />
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color={PAPER_COLOR} roughness={1} />
    </mesh>
  )
}

function PaperPad({ size }: { size: number }) {
  const pad = size + 1.4
  return (
    <mesh position={[0, 0, 0]} receiveShadow castShadow>
      <boxGeometry args={[pad, 0.02, pad]} />
      <meshStandardMaterial color={'#fff8e3'} roughness={0.95} />
    </mesh>
  )
}

function DotGrid({ size }: { size: number }) {
  const dots: JSX.Element[] = []
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c <= size; c++) {
      const [x, , z] = dotPos(size, r, c)
      dots.push(
        <mesh key={`${r}-${c}`} position={[x, 0.085, z]} castShadow>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color={'#3b3a3a'} roughness={0.5} />
        </mesh>,
      )
    }
  }
  return <>{dots}</>
}
