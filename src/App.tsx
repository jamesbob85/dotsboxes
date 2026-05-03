import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import HUD from './hud/HUD'
import { useGame } from './game/useGame'

export default function App() {
  const { state, draw, reset } = useGame(6)
  const isHumanTurn =
    state.status === 'playing' && state.players[state.current].kind === 'human'
  const currentColor = state.players[state.current].color

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <Scene
          state={state}
          onLineClick={draw}
          isHumanTurn={isHumanTurn}
          currentColor={currentColor}
        />
      </Canvas>
      <HUD state={state} onReset={reset} />
    </div>
  )
}
