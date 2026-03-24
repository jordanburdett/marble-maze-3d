import { useEffect, useRef, useCallback } from 'react'
import { joystickInputRef } from '../utils/inputRefs'

const MAX_TILT_ANGLE = (12 * Math.PI) / 180 // 12 degrees in radians
const TILT_RATE = 3.0 // radians per second toward max
const RETURN_RATE = 4.0 // radians per second back to center

interface TiltState {
  /** Current tilt around X axis (tilts board forward/back) */
  tiltX: number
  /** Current tilt around Z axis (tilts board left/right) */
  tiltZ: number
}

interface KeyState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

interface MouseTiltState {
  active: boolean
  offsetX: number
  offsetZ: number
}

/**
 * Input system that maps keyboard/mouse/joystick to board tilt values.
 * Returns a ref to the current tilt state that can be read each frame.
 */
export function useInput(enabled: boolean) {
  const tiltRef = useRef<TiltState>({ tiltX: 0, tiltZ: 0 })
  const keysRef = useRef<KeyState>({ up: false, down: false, left: false, right: false })
  const mouseRef = useRef<MouseTiltState>({ active: false, offsetX: 0, offsetZ: 0 })
  const lastTimeRef = useRef<number>(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    const keys = keysRef.current
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        keys.up = true; e.preventDefault(); break
      case 'ArrowDown': case 's': case 'S':
        keys.down = true; e.preventDefault(); break
      case 'ArrowLeft': case 'a': case 'A':
        keys.left = true; e.preventDefault(); break
      case 'ArrowRight': case 'd': case 'D':
        keys.right = true; e.preventDefault(); break
    }
  }, [enabled])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const keys = keysRef.current
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        keys.up = false; break
      case 'ArrowDown': case 's': case 'S':
        keys.down = false; break
      case 'ArrowLeft': case 'a': case 'A':
        keys.left = false; break
      case 'ArrowRight': case 'd': case 'D':
        keys.right = false; break
    }
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return
    if (e.button === 2) { // Right click
      mouseRef.current.active = true
      e.preventDefault()
    }
  }, [enabled])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 2) {
      mouseRef.current.active = false
      mouseRef.current.offsetX = 0
      mouseRef.current.offsetZ = 0
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!mouseRef.current.active) return
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    // Normalize offset to [-1, 1]
    mouseRef.current.offsetX = Math.max(-1, Math.min(1, (e.clientX - cx) / (cx * 0.5)))
    mouseRef.current.offsetZ = Math.max(-1, Math.min(1, (e.clientY - cy) / (cy * 0.5)))
  }, [])

  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault()
  }, [])

  // Register event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleMouseMove, handleContextMenu])

  // Reset keys when disabled
  useEffect(() => {
    if (!enabled) {
      keysRef.current = { up: false, down: false, left: false, right: false }
      mouseRef.current = { active: false, offsetX: 0, offsetZ: 0 }
    }
  }, [enabled])

  /**
   * Call this each frame (from useFrame) with the current timestamp.
   * Updates the tilt ref based on keyboard, mouse, and virtual joystick input.
   */
  const updateTilt = useCallback((timestamp: number) => {
    const dt = lastTimeRef.current === 0 ? 1 / 60 : Math.min((timestamp - lastTimeRef.current) / 1000, 0.1)
    lastTimeRef.current = timestamp

    if (!enabled) {
      tiltRef.current.tiltX = 0
      tiltRef.current.tiltZ = 0
      return
    }

    const keys = keysRef.current
    const mouse = mouseRef.current
    const tilt = tiltRef.current

    // Calculate target tilt from keyboard
    let targetX = 0
    let targetZ = 0

    if (keys.up) targetX += 1
    if (keys.down) targetX -= 1
    if (keys.left) targetZ -= 1
    if (keys.right) targetZ += 1

    // Mouse overrides keyboard if active
    if (mouse.active) {
      targetX = -mouse.offsetZ // Mouse Y -> board X tilt (inverted)
      targetZ = mouse.offsetX  // Mouse X -> board Z tilt
    }

    // Virtual joystick overrides both if active
    if (joystickInputRef.active) {
      targetX = -joystickInputRef.y // Joystick Y -> board X tilt (inverted)
      targetZ = joystickInputRef.x  // Joystick X -> board Z tilt
    }

    // Scale to max angle
    targetX *= MAX_TILT_ANGLE
    targetZ *= MAX_TILT_ANGLE

    // Lerp toward target
    const rate = (targetX !== 0 || targetZ !== 0) ? TILT_RATE : RETURN_RATE

    if (Math.abs(targetX - tilt.tiltX) < rate * dt) {
      tilt.tiltX = targetX
    } else {
      tilt.tiltX += Math.sign(targetX - tilt.tiltX) * rate * dt
    }

    if (Math.abs(targetZ - tilt.tiltZ) < rate * dt) {
      tilt.tiltZ = targetZ
    } else {
      tilt.tiltZ += Math.sign(targetZ - tilt.tiltZ) * rate * dt
    }
  }, [enabled])

  return { tiltRef, updateTilt }
}
