import { BotLevel, GameState } from '../engine/types'
import { winners } from '../engine/gameEngine'

interface Props {
  state: GameState
  onReset: () => void
  botLevel: BotLevel
  onBotLevelChange: (level: BotLevel) => void
}

export default function HUD({ state, onReset, botLevel, onBotLevelChange }: Props) {
  const isOver = state.status === 'gameover'
  const winnerIds = isOver ? winners(state) : []
  const totalBoxes = state.size * state.size
  const claimed = state.boxOwner.size
  const showExtraTurn =
    !isOver &&
    state.lastCapturedBy !== null &&
    state.lastCapturedBy === state.current

  return (
    <>
      <div style={scoreboardStyle}>
        {state.players.map((p, i) => {
          const active = !isOver && i === state.current
          return (
            <div
              key={p.id}
              style={{
                ...playerCardStyle,
                outline: active ? `3px solid ${p.color}` : '3px solid transparent',
                background: active ? '#ffffffee' : '#ffffffaa',
              }}
            >
              <span style={{ ...swatchStyle, background: p.color }} />
              <span style={nameStyle}>{p.name}</span>
              <span style={scoreStyle}>{state.scores[i]}</span>
              {active && showExtraTurn && (
                <span style={{ ...extraTurnStyle, background: p.color }}>+1 GO AGAIN</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={progressStyle}>
        {claimed} / {totalBoxes} boxes
      </div>

      <div style={debugPanelStyle}>
        <label style={debugLabelStyle}>Bot</label>
        <select
          value={botLevel}
          onChange={(e) => onBotLevelChange(e.target.value as BotLevel)}
          style={selectStyle}
          aria-label="Bot difficulty"
        >
          <option value="easy">Dumb</option>
          <option value="medium">Smart</option>
        </select>
        <button style={resetButtonStyle} onClick={onReset} aria-label="New game">
          ↻
        </button>
      </div>

      {isOver && (
        <div style={overlayStyle}>
          <div style={panelStyle}>
            <div style={titleStyle}>
              {winnerIds.length === 1
                ? `${state.players[winnerIds[0]].name} wins`
                : 'It’s a tie'}
            </div>
            <div style={finalScoresStyle}>
              {state.players.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ ...swatchStyle, background: p.color }} />
                  <span>{p.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{state.scores[i]}</span>
                </div>
              ))}
            </div>
            <button style={buttonStyle} onClick={onReset}>
              New game
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const scoreboardStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16,
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  flexWrap: 'wrap',
  pointerEvents: 'none',
}

const playerCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 999,
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  fontSize: 15,
  fontWeight: 600,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  transition: 'outline-color 120ms ease, background 120ms ease',
}

const swatchStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: 4,
  display: 'inline-block',
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
}

const nameStyle: React.CSSProperties = {
  color: '#2b2b2b',
}

const scoreStyle: React.CSSProperties = {
  background: '#2b2b2b',
  color: '#fff',
  borderRadius: 999,
  padding: '2px 10px',
  fontVariantNumeric: 'tabular-nums',
  minWidth: 28,
  textAlign: 'center',
}

const progressStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 0,
  right: 0,
  textAlign: 'center',
  color: '#3a3a3a',
  fontSize: 13,
  fontWeight: 500,
  opacity: 0.7,
  pointerEvents: 'none',
}

const debugPanelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 12,
  background: '#ffffffcc',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  fontSize: 13,
  color: '#2b2b2b',
}

const debugLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  fontSize: 11,
  color: '#5a5a5a',
}

const selectStyle: React.CSSProperties = {
  border: '1px solid #d4d4d4',
  borderRadius: 8,
  padding: '4px 8px',
  fontSize: 13,
  fontWeight: 600,
  background: '#fffaef',
  color: '#2b2b2b',
  cursor: 'pointer',
}

const resetButtonStyle: React.CSSProperties = {
  background: '#2b2b2b',
  color: '#fffaef',
  border: 'none',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  lineHeight: 1,
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(35, 50, 25, 0.45)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}

const panelStyle: React.CSSProperties = {
  background: '#fffaef',
  borderRadius: 18,
  padding: '28px 32px',
  boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  minWidth: 260,
}

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#2b2b2b',
  textAlign: 'center',
}

const finalScoresStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 16,
  color: '#2b2b2b',
}

const buttonStyle: React.CSSProperties = {
  marginTop: 4,
  background: '#2b2b2b',
  color: '#fffaef',
  border: 'none',
  borderRadius: 999,
  padding: '10px 18px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}

const extraTurnStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.5,
  borderRadius: 999,
  padding: '3px 8px',
  marginLeft: 4,
}
