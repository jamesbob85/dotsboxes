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

const PAPER_COLOR = '#fbf3dc'

export default function Scene({ state, onLineClick, isHumanTurn, currentColor }: Props) {
  return (
    <>
      <CameraRig size={state.size} />

      <color attach="background" args={[PAPER_COLOR]} />

      <ambientLight intensity={0.9} color={'#ffffff'} />
      <directionalLight
        position={[4, 10, 6]}
        intensity={0.6}
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
      <Boxes state={state} />
      <Lines
        state={state}
        onClick={onLineClick}
        isHumanTurn={isHumanTurn}
        currentColor={currentColor}
      />
      <DotGrid size={state.size} />
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

  camera.lookAt(0, 0, 0)

  return (
    <OrthographicCamera
      makeDefault
      position={[0, 10, 0.0001]}
      zoom={zoom}
      near={-50}
      far={50}
    />
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color={PAPER_COLOR} roughness={1} />
    </mesh>
  )
}

function DotGrid({ size }: { size: number }) {
  const dots: JSX.Element[] = []
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c <= size; c++) {
      const [x, , z] = dotPos(size, r, c)
      dots.push(
        <mesh key={`${r}-${c}`} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.085, 24]} />
          <meshBasicMaterial color={'#3b3a3a'} />
        </mesh>,
      )
    }
  }
  return <>{dots}</>
}
