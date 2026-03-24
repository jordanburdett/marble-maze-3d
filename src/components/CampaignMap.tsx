import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { WORLDS, getWorldLevels } from '../data/levels'
import type { WorldMeta } from '../data/levels'

interface CampaignMapProps {
  onSelectLevel: (levelId: number) => void
  onBack: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}.${ms}`
  return `${secs}.${ms}s`
}

/** Compute total stars earned across all campaign progress */
function useTotalStars(): number {
  const campaignProgress = useGameStore(s => s.campaignProgress)
  return Object.values(campaignProgress.levels).reduce(
    (sum, lp) => sum + lp.stars, 0,
  )
}

/** Check if a world is unlocked */
function isWorldUnlocked(world: WorldMeta, totalStars: number): boolean {
  return totalStars >= world.starsToUnlock
}

/** Check if a level is unlocked in the campaign */
function isLevelUnlocked(
  levelId: number,
  campaignLevels: Record<string, { stars: number }>,
  worldUnlocked: boolean,
): boolean {
  if (!worldUnlocked) return false
  // First level of each world is unlocked if the world is unlocked
  const worldIdx = WORLDS.findIndex(w => levelId >= w.levelRange[0] && levelId <= w.levelRange[1])
  if (worldIdx >= 0 && levelId === WORLDS[worldIdx].levelRange[0]) return true
  // Otherwise, previous level must be completed
  return Boolean(campaignLevels[String(levelId - 1)])
}

export function CampaignMap({ onSelectLevel, onBack }: CampaignMapProps) {
  const [selectedWorld, setSelectedWorld] = useState(1)
  const campaignProgress = useGameStore(s => s.campaignProgress)
  const totalStars = useTotalStars()

  const currentWorld = WORLDS.find(w => w.id === selectedWorld)
  const worldLevels = getWorldLevels(selectedWorld)
  const worldUnlocked = currentWorld ? isWorldUnlocked(currentWorld, totalStars) : false

  return (
    <div style={containerStyle} role="dialog" aria-label="Campaign map">
      {/* World selector tabs */}
      <div style={worldTabsStyle}>
        {WORLDS.map(world => {
          const unlocked = isWorldUnlocked(world, totalStars)
          const active = world.id === selectedWorld
          return (
            <button
              key={world.id}
              style={{
                ...worldTabStyle,
                borderColor: active ? world.colors[1] : 'rgba(255,255,255,0.15)',
                background: active
                  ? `linear-gradient(135deg, ${world.colors[0]}88, ${world.colors[1]}44)`
                  : 'rgba(255,255,255,0.05)',
                opacity: unlocked ? 1 : 0.4,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
              onClick={() => unlocked && setSelectedWorld(world.id)}
              disabled={!unlocked}
              aria-label={`${world.name}${unlocked ? '' : ` (locked, need ${world.starsToUnlock} stars)`}`}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                {world.name}
              </span>
              {!unlocked && (
                <span style={{ fontSize: '11px', color: '#aaa' }}>
                  {'\u{1F512}'} {world.starsToUnlock} stars
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Star counter */}
      <div style={starCounterStyle}>
        <span style={{ color: '#FFD700', fontSize: '20px' }}>{'\u2605'}</span>
        <span style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
          {totalStars} / 90
        </span>
      </div>

      {/* World title */}
      {currentWorld && (
        <h2 style={{
          ...worldTitleStyle,
          color: currentWorld.colors[1],
          textShadow: `0 2px 12px ${currentWorld.colors[1]}44`,
        }}>
          World {currentWorld.id}: {currentWorld.name}
        </h2>
      )}

      {/* Level grid */}
      <div style={levelGridStyle}>
        {worldLevels.map(level => {
          const progress = campaignProgress.levels[String(level.id)]
          const unlocked = isLevelUnlocked(level.id, campaignProgress.levels, worldUnlocked)
          const localId = level.id - (currentWorld?.levelRange[0] ?? 1) + 1

          return (
            <button
              key={level.id}
              style={{
                ...levelNodeStyle,
                opacity: unlocked ? 1 : 0.35,
                cursor: unlocked ? 'pointer' : 'not-allowed',
                borderColor: progress
                  ? (currentWorld?.colors[1] ?? '#FFD700')
                  : 'rgba(255,255,255,0.12)',
                background: progress
                  ? `linear-gradient(145deg, ${currentWorld?.colors[0]}44, ${currentWorld?.colors[1]}22)`
                  : 'rgba(255,255,255,0.06)',
              }}
              onClick={() => unlocked && onSelectLevel(level.id)}
              disabled={!unlocked}
              aria-label={
                `Level ${level.id}: ${level.name}` +
                (progress ? `, ${progress.stars} stars, best time ${formatTime(progress.bestTime)}` : '') +
                (!unlocked ? ' (locked)' : '')
              }
            >
              <span style={levelNumStyle}>{localId}</span>
              <span style={levelNameStyle}>{level.name}</span>
              <div style={starsRowStyle}>
                {[1, 2, 3].map(s => (
                  <span
                    key={s}
                    style={{
                      fontSize: '14px',
                      color: progress && s <= progress.stars ? '#FFD700' : '#444',
                    }}
                  >
                    {'\u2605'}
                  </span>
                ))}
              </div>
              {progress && (
                <span style={bestTimeStyle}>{formatTime(progress.bestTime)}</span>
              )}
              {!unlocked && (
                <span style={lockIconStyle}>{'\u{1F512}'}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Back button */}
      <button style={backButtonStyle} onClick={onBack}>
        Back to Menu
      </button>
    </div>
  )
}

// ---------- Styles ----------

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  zIndex: 100,
  padding: '16px',
  overflowY: 'auto',
}

const worldTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
  flexWrap: 'wrap',
  justifyContent: 'center',
}

const worldTabStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  padding: '10px 18px',
  borderRadius: '10px',
  border: '2px solid',
  transition: 'all 0.2s',
  minWidth: '120px',
}

const starCounterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '8px',
}

const worldTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '16px',
}

const levelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
  gap: '10px',
  maxWidth: '600px',
  width: '100%',
  marginBottom: '20px',
}

const levelNodeStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  padding: '12px 6px',
  borderRadius: '12px',
  border: '1px solid',
  color: '#fff',
  transition: 'all 0.2s',
}

const levelNumStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
}

const levelNameStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#aaa',
  textAlign: 'center',
  lineHeight: 1.2,
}

const starsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2px',
}

const bestTimeStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#888',
}

const lockIconStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '6px',
  fontSize: '12px',
}

const backButtonStyle: React.CSSProperties = {
  padding: '10px 32px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'rgba(255,255,255,0.1)',
  color: '#ccc',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  cursor: 'pointer',
  marginTop: 'auto',
  marginBottom: '12px',
}
