/**
 * useTiltControls — DeviceOrientation API for mobile tilt control.
 * Calibrates on first activation. Handles iOS permission request.
 */

import { useEffect, useRef, useCallback, useState } from 'react'

const MAX_TILT_DEGREES = 20

interface TiltOutput {
  tiltX: number
  tiltZ: number
}

interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
}

/** Check if iOS requires explicit permission request */
function checkNeedsPermission(): boolean {
  const doeConstructor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorWithPermission
  return typeof doeConstructor.requestPermission === 'function'
}

/**
 * Hook that reads device orientation and outputs tilt values.
 * Returns a ref to tilt state that can be read each frame.
 */
export function useTiltControls(enabled: boolean) {
  const tiltRef = useRef<TiltOutput>({ tiltX: 0, tiltZ: 0 })
  const calibrationRef = useRef<{ beta: number; gamma: number } | null>(null)

  // Compute initial state synchronously (no effect needed)
  const iosNeedsPermission = checkNeedsPermission()
  const [permissionGranted, setPermissionGranted] = useState(!iosNeedsPermission)
  const [needsPermission] = useState(iosNeedsPermission)

  // Request permission (must be called from a user gesture)
  const requestPermission = useCallback(async () => {
    try {
      const doeConstructor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorWithPermission
      if (typeof doeConstructor.requestPermission === 'function') {
        const result = await doeConstructor.requestPermission()
        if (result === 'granted') {
          setPermissionGranted(true)
        }
      }
    } catch {
      // Permission denied or not available
    }
  }, [])

  // Listen for device orientation events
  useEffect(() => {
    if (!enabled || !permissionGranted) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0  // front-back tilt [-180, 180]
      const gamma = e.gamma ?? 0 // left-right tilt [-90, 90]

      // Calibrate on first reading
      if (!calibrationRef.current) {
        calibrationRef.current = { beta, gamma }
      }

      const cal = calibrationRef.current
      const dBeta = beta - cal.beta
      const dGamma = gamma - cal.gamma

      // Normalize to [-1, 1]
      const normalizedX = Math.max(-1, Math.min(1, dBeta / MAX_TILT_DEGREES))
      const normalizedZ = Math.max(-1, Math.min(1, dGamma / MAX_TILT_DEGREES))

      // Map to board tilt (12 degrees max)
      const MAX_TILT_ANGLE = (12 * Math.PI) / 180
      tiltRef.current.tiltX = normalizedX * MAX_TILT_ANGLE
      tiltRef.current.tiltZ = normalizedZ * MAX_TILT_ANGLE
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [enabled, permissionGranted])

  // Reset calibration when re-enabled
  useEffect(() => {
    if (enabled) {
      calibrationRef.current = null
    } else {
      tiltRef.current.tiltX = 0
      tiltRef.current.tiltZ = 0
    }
  }, [enabled])

  return {
    tiltRef,
    needsPermission,
    permissionGranted,
    requestPermission,
  }
}

/** Check if the device likely supports tilt (has accelerometer) */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
