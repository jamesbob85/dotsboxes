import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import Lines from './Lines'
import Boxes from './Boxes'
import { GameState, LineId } from '../engine/types'
import { dotPos } from './coords'

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

      <color attach="background" args={['#cde4b8']} />

      <ambientLight intensity={0.55} color={'#fff5e0'} />
      <hemisphereLight args={['#fff5e0', '#8aa86a', 0.4]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.4}
        color={'#fff1d0'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />

      <Ground />
      <PaperPad size={state.size} />
      <DotGrid size={state.size} />
      <Boxes state={state} />
      <Lines
        state={state}
        onClick={onLineClick}
        isHumanTurn={isHumanTurn}
        currentColor={currentColor}
      />
    </>
  )
}

function CameraRig({ size }: { size: number }) {
  const viewport = useThree((s) => s.viewport)
  const camera = useThree((s) => s.camera)

  const zoom = useMemo(() => {
    // Fit board (size + padding) into the smaller screen dimension.
    const target = size + 3
    const min = Math.min(viewport.width, viewport.height)
    return (min / target) * 38
  }, [size, viewport.width, viewport.height])

  // Camera elevation ~30° from horizontal (sin 30 = 0.5).
  // Positioned so center of board is at origin.
  // y / sqrt(y^2 + z^2) = sin(30) → with z=10, y ≈ 5.77
  camera.lookAt(0, 0, 0)

  return (
    <OrthographicCamera
      makeDefault
      position={[0, 5.77, 10]}
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
      <meshStandardMaterial color={'#a8c98a'} roughness={1} />
    </mesh>
  )
}

function PaperPad({ size }: { size: number }) {
  const pad = size + 1.2
  return (
    <mesh position={[0, -0.005, 0]} receiveShadow castShadow>
      <boxGeometry args={[pad, 0.12, pad]} />
      <meshStandardMaterial color={'#fbf3dc'} roughness={0.95} />
    </mesh>
  )
}

function DotGrid({ size }: { size: number }) {
  const dots: JSX.Element[] = []
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c <= size; c++) {
      const [x, , z] = dotPos(size, r, c)
      dots.push(
        <mesh key={`${r}-${c}`} position={[x, 0.08, z]} castShadow>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshStandardMaterial color={'#3b3a3a'} roughness={0.6} />
        </mesh>,
      )
    }
  }
  return <>{dots}</>
}
