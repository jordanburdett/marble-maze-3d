import { useGameStore } from '../store/gameStore'
import type { Level } from '../data/levels'
import { WORLD_1_LEVEL_COUNT } from '../data/levels'

const GEM_LABELS = ['Emerald', 'Sapphire', 'Ruby'] as const
const GEM_COLORS = ['#50C878', '#2E5090', '#E0115F'] as const

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}.${ms}`
  return `${secs}.${ms}s`
}

function starRating(time: number, thresholds: [number, number, number], allGems: boolean): number {
  let stars = 1
  if (time <= thresholds[1]) stars = 2
  if (time <= thresholds[0]) stars = 3
  if (allGems && stars < 3) stars = Math.min(stars + 1, 3)
  return stars
}

// --- Menu Screen ---
interface MenuProps {
  onStartCampaign: () => void
}

export function MenuScreen({ onStartCampaign }: MenuProps) {
  const campaignProgress = useGameStore(s => s.campaignProgress)
  const totalStars = Object.values(campaignProgress.levels).reduce(
    (sum, lp) => sum + lp.stars, 0,
  )
  const levelsCompleted = Object.keys(campaignProgress.levels).length

  return (
    <div style={menuContainerStyle} role="dialog" aria-label="Main menu">
      <h1 style={titleStyle}>Marble Maze 3D</h1>
      <p style={subtitleStyle}>Tilt the board. Guide the marble. Collect the gems.</p>

      <div style={menuCardStyle}>
        <button style={menuButtonStyle} onClick={onStartCampaign}>
          Campaign
        </button>
        <p style={progressTextStyle}>
          {levelsCompleted}/{WORLD_1_LEVEL_COUNT} levels | {totalStars} stars
        </p>
      </div>

      <div style={controlsInfoStyle}>
        <p><strong>Controls:</strong></p>
        <p>Arrow Keys / WASD - Tilt board</p>
        <p>Right-click + Drag - Mouse tilt</p>
        <p>Esc - Pause</p>
      </div>
    </div>
  )
}

// --- In-Game HUD ---
interface HUDProps {
  level: Level
  onPause: () => void
}

export function GameHUD({ level, onPause }: HUDProps) {
  const timer = useGameStore(s => s.timer)
  const gemsCollected = useGameStore(s => s.gemsCollected)

  return (
    <div style={hudContainerStyle} role="status" aria-label="Game HUD">
      <div style={hudTopBar}>
        <span style={levelNameStyle}>{level.name}</span>
        <span style={timerStyle}>{formatTime(timer)}</span>
        <button style={pauseButtonStyle} onClick={onPause} aria-label="Pause game">
          ||
        </button>
      </div>
      <div style={gemBarStyle}>
        {gemsCollected.map((collected, i) => (
          <span
            key={i}
            style={{
              ...gemIndicatorStyle,
              backgroundColor: collected ? GEM_COLORS[i] : '#444',
              opacity: collected ? 1 : 0.4,
            }}
            aria-label={`${GEM_LABELS[i]}: ${collected ? 'collected' : 'not collected'}`}
          >
            {collected ? '\u2666' : '\u25C7'}
          </span>
        ))}
      </div>
    </div>
  )
}

// --- Pause Overlay ---
interface PauseProps {
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
}

export function PauseOverlay({ onResume, onRestart, onMenu }: PauseProps) {
  return (
    <div style={overlayStyle} role="dialog" aria-label="Game paused">
      <div style={overlayCardStyle}>
        <h2 style={overlayTitleStyle}>Paused</h2>
        <button style={overlayButtonStyle} onClick={onResume}>Resume</button>
        <button style={overlayButtonStyle} onClick={onRestart}>Restart Level</button>
        <button style={overlayButtonSecondaryStyle} onClick={onMenu}>Main Menu</button>
      </div>
    </div>
  )
}

// --- Level Complete Overlay ---
interface CompleteProps {
  level: Level
  onNextLevel: () => void
  onRestart: () => void
  onMenu: () => void
}

export function LevelCompleteOverlay({ level, onNextLevel, onRestart, onMenu }: CompleteProps) {
  const timer = useGameStore(s => s.timer)
  const gemsCollected = useGameStore(s => s.gemsCollected)
  const allGems = gemsCollected.every(Boolean)
  const gemCount = gemsCollected.filter(Boolean).length
  const stars = starRating(timer, level.starThresholds, allGems)
  const hasNextLevel = level.id < WORLD_1_LEVEL_COUNT

  return (
    <div style={overlayStyle} role="dialog" aria-label="Level complete">
      <div style={overlayCardStyle}>
        <h2 style={overlayTitleStyle}>Level Complete!</h2>
        <div style={starsRowStyle}>
          {[1, 2, 3].map(s => (
            <span
              key={s}
              style={{
                ...starStyle,
                color: s <= stars ? '#FFD700' : '#555',
              }}
            >
              {'\u2605'}
            </span>
          ))}
        </div>
        <p style={statStyle}>Time: {formatTime(timer)}</p>
        <p style={statStyle}>Gems: {gemCount}/3 {allGems ? '- Perfect!' : ''}</p>
        {hasNextLevel && (
          <button style={overlayButtonStyle} onClick={onNextLevel}>Next Level</button>
        )}
        <button style={overlayButtonStyle} onClick={onRestart}>Replay</button>
        <button style={overlayButtonSecondaryStyle} onClick={onMenu}>Main Menu</button>
      </div>
    </div>
  )
}

// --- Failed Overlay ---
interface FailedProps {
  onRestart: () => void
  onMenu: () => void
}

export function LevelFailedOverlay({ onRestart, onMenu }: FailedProps) {
  return (
    <div style={overlayStyle} role="dialog" aria-label="Level failed">
      <div style={overlayCardStyle}>
        <h2 style={{ ...overlayTitleStyle, color: '#FF6666' }}>Fell In!</h2>
        <p style={statStyle}>Resetting...</p>
        <button style={overlayButtonStyle} onClick={onRestart}>Restart</button>
        <button style={overlayButtonSecondaryStyle} onClick={onMenu}>Main Menu</button>
      </div>
    </div>
  )
}

// --- Level Select ---
interface LevelSelectProps {
  onSelectLevel: (id: number) => void
  onBack: () => void
}

export function LevelSelectScreen({ onSelectLevel, onBack }: LevelSelectProps) {
  const campaignProgress = useGameStore(s => s.campaignProgress)

  return (
    <div style={menuContainerStyle} role="dialog" aria-label="Level select">
      <h2 style={titleStyle}>World 1: Wooden Workshop</h2>
      <div style={levelGridStyle}>
        {Array.from({ length: WORLD_1_LEVEL_COUNT }, (_, i) => {
          const id = i + 1
          const progress = campaignProgress.levels[String(id)]
          const unlocked = id === 1 || campaignProgress.levels[String(id - 1)]
          return (
            <button
              key={id}
              style={{
                ...levelCardStyle,
                opacity: unlocked ? 1 : 0.4,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
              onClick={() => unlocked && onSelectLevel(id)}
              disabled={!unlocked}
              aria-label={`Level ${id}${progress ? `, ${progress.stars} stars` : ''}`}
            >
              <span style={levelNumberStyle}>{id}</span>
              <div style={starsRowSmallStyle}>
                {[1, 2, 3].map(s => (
                  <span
                    key={s}
                    style={{
                      fontSize: '14px',
                      color: progress && s <= progress.stars ? '#FFD700' : '#555',
                    }}
                  >
                    {'\u2605'}
                  </span>
                ))}
              </div>
              {progress && (
                <span style={bestTimeStyle}>{formatTime(progress.bestTime)}</span>
              )}
            </button>
          )
        })}
      </div>
      <button style={overlayButtonSecondaryStyle} onClick={onBack}>Back</button>
    </div>
  )
}

// ---------- Styles (inline to avoid extra CSS files) ----------

const menuContainerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  zIndex: 100,
  padding: '20px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '48px',
  fontWeight: 700,
  color: '#FFD700',
  textShadow: '0 2px 20px rgba(255,215,0,0.3)',
  marginBottom: '8px',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#aaa',
  marginBottom: '32px',
}

const menuCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '24px',
}

const menuButtonStyle: React.CSSProperties = {
  padding: '14px 48px',
  fontSize: '20px',
  fontWeight: 600,
  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'transform 0.15s',
}

const progressTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
}

const controlsInfoStyle: React.CSSProperties = {
  marginTop: '16px',
  fontSize: '13px',
  color: '#777',
  textAlign: 'center',
  lineHeight: 1.6,
}

const hudContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  pointerEvents: 'none',
  padding: '12px 16px',
}

const hudTopBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'rgba(0,0,0,0.5)',
  borderRadius: '10px',
  padding: '8px 16px',
  backdropFilter: 'blur(8px)',
}

const levelNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#fff',
}

const timerStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#FFD700',
  fontVariantNumeric: 'tabular-nums',
}

const pauseButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: '16px',
  fontWeight: 700,
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '6px',
  cursor: 'pointer',
  pointerEvents: 'auto',
  letterSpacing: '2px',
}

const gemBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '8px',
}

const gemIndicatorStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  color: '#fff',
  transition: 'all 0.3s ease',
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  zIndex: 50,
}

const overlayCardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #2a2a4a, #1a1a3a)',
  borderRadius: '16px',
  padding: '32px 48px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}

const overlayTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#FFD700',
  margin: '0 0 8px',
}

const overlayButtonStyle: React.CSSProperties = {
  padding: '10px 32px',
  fontSize: '16px',
  fontWeight: 600,
  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '180px',
}

const overlayButtonSecondaryStyle: React.CSSProperties = {
  padding: '10px 32px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'rgba(255,255,255,0.1)',
  color: '#ccc',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '180px',
}

const starsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '8px',
}

const starStyle: React.CSSProperties = {
  fontSize: '36px',
}

const statStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#ccc',
}

const levelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '12px',
  maxWidth: '450px',
  width: '100%',
  margin: '24px 0',
}

const levelCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  padding: '16px 8px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  cursor: 'pointer',
  color: '#fff',
}

const levelNumberStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
}

const starsRowSmallStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2px',
}

const bestTimeStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#888',
}
