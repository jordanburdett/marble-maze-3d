/**
 * TiltController — Invisible component that activates device tilt controls.
 * Mounted when control mode is 'tilt' and game is playing on mobile.
 * Handles iOS permission request via a button overlay if needed.
 */

import { useTiltControls } from '../hooks/useTiltControls'

interface TiltControllerProps {
  enabled: boolean
}

export function TiltController({ enabled }: TiltControllerProps) {
  const { needsPermission, permissionGranted, requestPermission } = useTiltControls(enabled)

  // If iOS needs permission and it hasn't been granted, show button
  if (needsPermission && !permissionGranted) {
    return (
      <div style={permissionOverlayStyle}>
        <button
          style={permissionButtonStyle}
          onClick={requestPermission}
        >
          Enable Tilt Controls
        </button>
        <p style={permissionHintStyle}>
          Tap to allow motion sensors
        </p>
      </div>
    )
  }

  // No visual output — tilt data flows through tiltInputRef
  return null
}

const permissionOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  zIndex: 20,
  pointerEvents: 'auto',
}

const permissionButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 600,
  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}

const permissionHintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.6)',
}
