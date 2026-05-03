import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'

export default function App() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ width: '100vw', height: '100vh', display: 'block' }}
    >
      <Scene />
    </Canvas>
  )
}
