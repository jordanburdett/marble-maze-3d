import { useState, useCallback } from 'react'
import { getDayNumber } from '../utils/mazeGenerator'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}.${ms}`
  return `${secs}.${ms}s`
}

interface DailyResultProps {
  time: number
  gemsCollected: number
  onMenu: () => void
}

/**
 * Daily result card shown after completing the daily maze.
 * Shows time, gem count, Perfect badge, and clipboard copy button.
 */
export function DailyResult({ time, gemsCollected, onMenu }: DailyResultProps) {
  const [copied, setCopied] = useState(false)
  const dayNumber = getDayNumber(new Date())
  const isPerfect = gemsCollected === 3

  const resultText = `Marble Maze Daily #${dayNumber} -- ${formatTime(time)} -- ${gemsCollected}/3${isPerfect ? ' Perfect' : ''}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resultText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [resultText])

  return (
    <div style={overlayStyle} role="dialog" aria-label="Daily maze result">
      <div style={cardStyle}>
        <h2 style={titleStyle}>Daily Maze #{dayNumber}</h2>

        <div style={statsStyle}>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>Time</span>
            <span style={statValueStyle}>{formatTime(time)}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>Gems</span>
            <span style={statValueStyle}>
              {gemsCollected}/3
              {isPerfect && <span style={perfectBadgeStyle}> Perfect</span>}
            </span>
          </div>
        </div>

        {/* Gem indicators */}
        <div style={gemRowStyle}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                ...gemDotStyle,
                backgroundColor: i < gemsCollected ? ['#50C878', '#2E5090', '#E0115F'][i] : '#444',
              }}
            >
              {i < gemsCollected ? '\u2666' : '\u25C7'}
            </span>
          ))}
        </div>

        <button style={copyButtonStyle} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Result'}
        </button>

        <button style={menuButtonStyle} onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  )
}

// ---------- Styles ----------

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

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #2a2a4a, #1a1a3a)',
  borderRadius: '16px',
  padding: '32px 48px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  minWidth: '280px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#FFD700',
  margin: '0 0 8px',
}

const statsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
}

const statRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#fff',
}

const perfectBadgeStyle: React.CSSProperties = {
  color: '#FFD700',
  fontSize: '14px',
  fontWeight: 700,
}

const gemRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  margin: '8px 0',
}

const gemDotStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: '#fff',
}

const copyButtonStyle: React.CSSProperties = {
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

const menuButtonStyle: React.CSSProperties = {
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
