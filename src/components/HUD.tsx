import { useEffect } from 'react'
import { useGameStore, calculateStars, GameMode } from '../store/gameStore'
import type { Level } from '../data/levels'
import { TOTAL_LEVEL_COUNT, ALL_LEVELS } from '../data/levels'
import { useReducedMotion } from '../hooks/useReducedMotion'

const GEM_LABELS = ['Emerald', 'Sapphire', 'Ruby'] as const
const GEM_COLORS = ['#50C878', '#2E5090', '#E0115F'] as const

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}.${ms}`
  return `${secs}.${ms}s`
}

// --- Menu Screen ---
interface MenuProps {
  onStartCampaign: () => void
  onStartDaily: () => void
  onStartFreeplay: () => void
  onSettings?: () => void
}

export function MenuScreen({ onStartCampaign, onStartDaily, onStartFreeplay, onSettings }: MenuProps) {
  const campaignProgress = useGameStore(s => s.campaignProgress)
  const totalStars = Object.values(campaignProgress.levels).reduce(
    (sum, lp) => sum + lp.stars, 0,
  )
  const levelsCompleted = Object.keys(campaignProgress.levels).length

  return (
    <div style={menuContainerStyle} role="dialog" aria-label="Main menu">
      <h1 style={titleStyle}>Marble Maze 3D</h1>
      <p style={subtitleStyle}>Tilt the board. Guide the marble. Collect the gems.</p>

      <div style={menuButtonsStyle}>
        <div style={menuCardStyle}>
          <button style={menuButtonStyle} onClick={onStartCampaign}>
            Campaign
          </button>
          <p style={progressTextStyle}>
            {levelsCompleted}/{TOTAL_LEVEL_COUNT} levels | {totalStars} stars
          </p>
        </div>

        <div style={menuCardStyle}>
          <button style={menuButtonDailyStyle} onClick={onStartDaily}>
            Daily Maze
          </button>
          <p style={progressTextStyle}>
            New maze every day
          </p>
        </div>

        <div style={menuCardStyle}>
          <button style={menuButtonFreeplayStyle} onClick={onStartFreeplay}>
            Free Play
          </button>
          <p style={progressTextStyle}>
            Random mazes + replay levels
          </p>
        </div>
      </div>

      {onSettings && (
        <button style={settingsButtonStyle} onClick={onSettings}>
          Settings
        </button>
      )}

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
  ghostBestTime?: number | null
  ghostFinished?: boolean
}

export function GameHUD({ level, onPause, ghostBestTime, ghostFinished }: HUDProps) {
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
      {ghostBestTime != null && ghostBestTime > 0 && (
        <div style={ghostInfoStyle} aria-label="Ghost best time">
          <span style={ghostTimeStyle}>Ghost: {formatTime(ghostBestTime)}</span>
          {ghostFinished && (
            <span style={ghostFlashStyle}>Ghost finished!</span>
          )}
        </div>
      )}
    </div>
  )
}

// --- Pause Overlay ---
interface PauseProps {
  onResume: () => void
  onRestart: () => void
  onSettings?: () => void
  onMenu: () => void
}

export function PauseOverlay({ onResume, onRestart, onSettings, onMenu }: PauseProps) {
  return (
    <div style={overlayStyle} role="dialog" aria-label="Game paused">
      <div style={overlayCardStyle}>
        <h2 style={overlayTitleStyle}>Paused</h2>
        <button style={overlayButtonStyle} onClick={onResume}>Resume</button>
        <button style={overlayButtonStyle} onClick={onRestart}>Restart Level</button>
        {onSettings && (
          <button style={overlayButtonSecondaryStyle} onClick={onSettings}>Settings</button>
        )}
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

/** Inject star-pop keyframes once */
const STAR_KEYFRAMES_ID = 'mm3d-star-pop'
function ensureStarKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STAR_KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = STAR_KEYFRAMES_ID
  style.textContent = `
    @keyframes mm3d-star-pop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.4); opacity: 1; }
      70% { transform: scale(0.85); }
      85% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

export function LevelCompleteOverlay({ level, onNextLevel, onRestart, onMenu }: CompleteProps) {
  const timer = useGameStore(s => s.timer)
  const gemsCollected = useGameStore(s => s.gemsCollected)
  const gameMode = useGameStore(s => s.gameMode)
  const allGems = gemsCollected.every(Boolean)
  const gemCount = gemsCollected.filter(Boolean).length
  const stars = calculateStars(timer, level.starThresholds, allGems)
  const hasNextLevel = gameMode === GameMode.Campaign && ALL_LEVELS.some(l => l.id === level.id + 1)
  const skipAnimation = useReducedMotion()

  // Inject keyframes on mount
  useEffect(() => {
    ensureStarKeyframes()
  }, [])

  return (
    <div style={overlayStyle} role="dialog" aria-label="Level complete">
      <div style={overlayCardStyle}>
        <h2 style={overlayTitleStyle}>Level Complete!</h2>
        <div style={starsRowStyle}>
          {[1, 2, 3].map(s => {
            const earned = s <= stars
            const animStyle: React.CSSProperties = earned && !skipAnimation
              ? {
                  animation: `mm3d-star-pop 0.4s ease-out ${s * 0.2}s both`,
                }
              : {}

            return (
              <span
                key={s}
                style={{
                  ...starStyle,
                  color: earned ? '#FFD700' : '#555',
                  display: 'inline-block',
                  ...animStyle,
                }}
              >
                {'\u2605'}
              </span>
            )
          })}
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

// --- Free Play Mode Select ---
interface FreePlaySelectProps {
  onSelectCampaignLevel: (id: number) => void
  onGenerateRandom: (size: 6 | 9 | 12) => void
  onBack: () => void
}

export function FreePlaySelect({ onSelectCampaignLevel, onGenerateRandom, onBack }: FreePlaySelectProps) {
  const campaignProgress = useGameStore(s => s.campaignProgress)
  const unlockedLevels = ALL_LEVELS.filter(
    l => Boolean(campaignProgress.levels[String(l.id)]),
  )

  return (
    <div style={menuContainerStyle} role="dialog" aria-label="Free play mode">
      <h2 style={titleStyle}>Free Play</h2>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Random Maze</h3>
        <div style={randomButtonsStyle}>
          <button style={overlayButtonStyle} onClick={() => onGenerateRandom(6)}>
            6x6 Easy
          </button>
          <button style={overlayButtonStyle} onClick={() => onGenerateRandom(9)}>
            9x9 Medium
          </button>
          <button style={overlayButtonStyle} onClick={() => onGenerateRandom(12)}>
            12x12 Hard
          </button>
        </div>
      </div>

      {unlockedLevels.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Replay Campaign Levels</h3>
          <div style={replayGridStyle}>
            {unlockedLevels.map(level => {
              const progress = campaignProgress.levels[String(level.id)]
              return (
                <button
                  key={level.id}
                  style={replayLevelStyle}
                  onClick={() => onSelectCampaignLevel(level.id)}
                  aria-label={`Replay level ${level.id}: ${level.name}`}
                >
                  <span style={{ fontSize: '18px', fontWeight: 700 }}>{level.id}</span>
                  <span style={{ fontSize: '9px', color: '#aaa' }}>{level.name}</span>
                  {progress && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3].map(s => (
                        <span key={s} style={{ fontSize: '10px', color: s <= progress.stars ? '#FFD700' : '#444' }}>
                          {'\u2605'}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button style={overlayButtonSecondaryStyle} onClick={onBack}>Back to Menu</button>
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
  overflowY: 'auto',
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

const menuButtonsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  alignItems: 'center',
  marginBottom: '24px',
}

const menuCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
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
  minWidth: '220px',
}

const menuButtonDailyStyle: React.CSSProperties = {
  ...menuButtonStyle,
  background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
  color: '#fff',
}

const menuButtonFreeplayStyle: React.CSSProperties = {
  ...menuButtonStyle,
  background: 'linear-gradient(135deg, #50C878, #228B22)',
  color: '#fff',
}

const progressTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
}

const settingsButtonStyle: React.CSSProperties = {
  padding: '10px 32px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'rgba(255,255,255,0.1)',
  color: '#ccc',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '180px',
  marginTop: '8px',
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

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '20px',
  width: '100%',
  maxWidth: '500px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#ccc',
}

const randomButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
}

const replayGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: '8px',
  width: '100%',
}

const replayLevelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  padding: '10px 6px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  cursor: 'pointer',
  color: '#fff',
}

const ghostInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  marginTop: '4px',
}

const ghostTimeStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'rgba(255,215,0,0.7)',
  fontVariantNumeric: 'tabular-nums',
}

const ghostFlashStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#FFD700',
  textShadow: '0 0 8px rgba(255,215,0,0.5)',
}
