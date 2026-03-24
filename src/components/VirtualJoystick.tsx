import { useRef, useCallback, useState } from 'react'

const OUTER_SIZE = 120
const THUMB_SIZE = 60
const MAX_DISTANCE = (OUTER_SIZE - THUMB_SIZE) / 2

interface VirtualJoystickProps {
  /** Called every move with normalized x,y in range [-1, 1] */
  onMove: (x: number, y: number) => void
  /** Called when user releases the joystick */
  onRelease: () => void
}

/**
 * Virtual joystick overlay for mobile touch controls.
 * Renders a 120px circle with 60px thumb, positioned bottom-left.
 * Touch-drag moves the thumb, outputting normalized direction.
 */
export function VirtualJoystick({ onMove, onRelease }: VirtualJoystickProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const touchIdRef = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return
    const touch = e.touches[0]
    touchIdRef.current = touch.identifier
    setActive(true)
    e.preventDefault()
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null || !outerRef.current) return

    let touch: React.Touch | null = null
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchIdRef.current) {
        touch = e.touches[i]
        break
      }
    }
    if (!touch) return

    const rect = outerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    let dx = touch.clientX - centerX
    let dy = touch.clientY - centerY

    // Clamp to max distance
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > MAX_DISTANCE) {
      dx = (dx / dist) * MAX_DISTANCE
      dy = (dy / dist) * MAX_DISTANCE
    }

    setThumbPos({ x: dx, y: dy })

    // Normalize to [-1, 1]
    const nx = dx / MAX_DISTANCE
    const ny = dy / MAX_DISTANCE
    onMove(nx, ny)

    e.preventDefault()
  }, [onMove])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Check if our tracked touch ended
    let found = false
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        found = true
        break
      }
    }
    if (!found) return

    touchIdRef.current = null
    setActive(false)
    setThumbPos({ x: 0, y: 0 })
    onRelease()
  }, [onRelease])

  return (
    <div
      ref={outerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={outerStyle}
      role="slider"
      aria-label="Virtual joystick for board tilt control"
      aria-valuemin={-1}
      aria-valuemax={1}
    >
      <div
        style={{
          ...thumbStyle,
          transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`,
          opacity: active ? 0.9 : 0.5,
        }}
      />
    </div>
  )
}

const outerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  left: '24px',
  width: `${OUTER_SIZE}px`,
  height: `${OUTER_SIZE}px`,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  border: '2px solid rgba(255,255,255,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'none',
  zIndex: 20,
  pointerEvents: 'auto',
}

const thumbStyle: React.CSSProperties = {
  width: `${THUMB_SIZE}px`,
  height: `${THUMB_SIZE}px`,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.4)',
  border: '2px solid rgba(255,255,255,0.5)',
  transition: 'opacity 0.1s',
  pointerEvents: 'none',
}
