import { useGameStore, ControlMode } from '../store/gameStore'
import type { GameSettings } from '../store/gameStore'
import { isMobileDevice } from '../hooks/useTiltControls'
import { AudioEngine } from '../utils/AudioEngine'

interface SettingsScreenProps {
  onBack: () => void
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const settings = useGameStore(s => s.settings)
  const updateSettings = useGameStore(s => s.updateSettings)
  const toggleMusicMode = useGameStore(s => s.toggleMusicMode)
  const mobile = isMobileDevice()

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    updateSettings({ musicVolume: val })
    AudioEngine.get().updateAmbientVolume()
  }

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ sfxVolume: parseFloat(e.target.value) })
  }

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ cameraSensitivity: parseFloat(e.target.value) })
  }

  const handleControlMode = (mode: GameSettings['controlMode']) => {
    updateSettings({ controlMode: mode })
  }

  return (
    <div style={containerStyle} role="dialog" aria-label="Settings">
      <h2 style={titleStyle}>Settings</h2>

      {/* Volume controls */}
      <div style={sectionStyle}>
        <label style={labelStyle} htmlFor="music-vol">
          Music Volume: {Math.round(settings.musicVolume * 100)}%
        </label>
        <input
          id="music-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.musicVolume}
          onChange={handleMusicChange}
          style={sliderStyle}
        />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle} htmlFor="sfx-vol">
          SFX Volume: {Math.round(settings.sfxVolume * 100)}%
        </label>
        <input
          id="sfx-vol"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVolume}
          onChange={handleSfxChange}
          style={sliderStyle}
        />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle} htmlFor="cam-sens">
          Camera Sensitivity: {settings.cameraSensitivity.toFixed(1)}x
        </label>
        <input
          id="cam-sens"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={settings.cameraSensitivity}
          onChange={handleSensitivityChange}
          style={sliderStyle}
        />
      </div>

      {/* Music Mode toggle — only show when SFX volume > 0 */}
      {settings.sfxVolume > 0 && (
        <div style={sectionStyle}>
          <div style={toggleRowStyle}>
            <label style={labelStyle} htmlFor="music-mode-toggle">
              Music Mode
            </label>
            <button
              id="music-mode-toggle"
              role="switch"
              aria-checked={settings.musicMode}
              aria-label="Music Mode"
              onClick={toggleMusicMode}
              style={{
                ...toggleStyle,
                background: settings.musicMode
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                  : 'rgba(255,255,255,0.15)',
              }}
            >
              <span
                style={{
                  ...toggleKnobStyle,
                  transform: settings.musicMode ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
          <span style={tooltipStyle}>
            Transform wall hits and zones into music
          </span>
        </div>
      )}

      {/* Control mode — only show mobile options on mobile */}
      {mobile && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Control Mode</span>
          <div style={buttonGroupStyle}>
            <button
              style={{
                ...modeButtonStyle,
                ...(settings.controlMode === ControlMode.Joystick ? activeButtonStyle : {}),
              }}
              onClick={() => handleControlMode(ControlMode.Joystick)}
            >
              Joystick
            </button>
            <button
              style={{
                ...modeButtonStyle,
                ...(settings.controlMode === ControlMode.Tilt ? activeButtonStyle : {}),
              }}
              onClick={() => handleControlMode(ControlMode.Tilt)}
            >
              Tilt
            </button>
          </div>
        </div>
      )}

      <button style={backButtonStyle} onClick={onBack}>
        Back
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
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  zIndex: 100,
  padding: '20px',
  gap: '16px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#FFD700',
  marginBottom: '16px',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  maxWidth: '300px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#ccc',
  fontWeight: 500,
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#FFD700',
  cursor: 'pointer',
}

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
}

const modeButtonStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'rgba(255,255,255,0.1)',
  color: '#ccc',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  cursor: 'pointer',
}

const activeButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
  color: '#1a1a2e',
  border: '1px solid #FFD700',
  fontWeight: 600,
}

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const toggleStyle: React.CSSProperties = {
  width: '44px',
  height: '24px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer',
  position: 'relative',
  padding: 0,
  flexShrink: 0,
}

const toggleKnobStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  background: '#fff',
  position: 'absolute',
  top: '2px',
  left: '3px',
  transition: 'transform 0.2s ease',
  pointerEvents: 'none',
}

const tooltipStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#999',
  fontStyle: 'italic',
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
  marginTop: '8px',
}
