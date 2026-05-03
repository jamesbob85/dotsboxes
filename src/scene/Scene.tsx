import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'

const GRID_SIZE = 6
const DOT_SPACING = 1

export default function Scene() {
  const viewport = useThree((s) => s.viewport)

  const zoom = useMemo(() => {
    const target = GRID_SIZE * DOT_SPACING + 2
    const min = Math.min(viewport.width, viewport.height)
    return (min / target) * 35
  }, [viewport.width, viewport.height])

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 9, 6]}
        zoom={zoom}
        near={-50}
        far={50}
      />
      <CameraLookAt />

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
      <DotGrid />
    </>
  )
}

function CameraLookAt() {
  const camera = useThree((s) => s.camera)
  camera.lookAt(0, 0, 0)
  return null
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={'#b9d59a'} roughness={1} />
    </mesh>
  )
}

function DotGrid() {
  const dots = []
  const half = (GRID_SIZE * DOT_SPACING) / 2
  for (let r = 0; r <= GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE; c++) {
      const x = c * DOT_SPACING - half
      const z = r * DOT_SPACING - half
      dots.push(
        <mesh key={`${r}-${c}`} position={[x, 0.06, z]} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={'#3b3a3a'} roughness={0.6} />
        </mesh>
      )
    }
  }
  return <>{dots}</>
}
