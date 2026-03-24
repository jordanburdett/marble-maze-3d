import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TrajectoryFrame } from '../utils/trajectoryRecorder'
import { ghostState } from '../utils/ghostState'
import { interpolateTrajectory, GHOST_BASE_OPACITY, GHOST_FADE_DURATION } from '../utils/ghostHelpers'
import type { GameStatus } from '../store/gameStore'
import { getGhostColor } from '../utils/ghostHelpers'
import { MusicEngine } from '../utils/MusicEngine'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

/** Knock opacity pulse constants */
const KNOCK_OPACITY_PEAK = 0.55
const KNOCK_PULSE_DURATION = 0.15 // seconds

/** Minimum speed delta to trigger a ghost knock */
const GHOST_KNOCK_SPEED_THRESHOLD = 0.5

interface GhostMarbleProps {
  trajectory: TrajectoryFrame[]
  worldId: number
  ghostEnabled: boolean
  gameStatus: GameStatus
  timer: number
}

/**
 * NON-PHYSICS translucent ghost marble that replays a stored trajectory.
 * Purely visual — no RigidBody, no collisions.
 * Triggers ghost music (sine wave knock + perfect-fifth drone) based on speed changes.
 */
export function GhostMarble({ trajectory, worldId, ghostEnabled, gameStatus, timer }: GhostMarbleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const fadeStartTime = useRef<number | null>(null)

  // Ghost speed tracking
  const prevPosition = useRef<{ x: number; y: number; z: number } | null>(null)
  const prevTimer = useRef<number>(0)
  const prevSpeed = useRef<number>(0)
  const ghostDroneStarted = useRef(false)

  // Knock pulse state
  const knockPulseTime = useRef<number | null>(null)

  const color = getGhostColor(worldId)
  const clampedWorldId = (Math.max(1, Math.min(3, worldId)) as 1 | 2 | 3)

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: GHOST_BASE_OPACITY,
      depthWrite: false,
      metalness: 0.6,
      roughness: 0.3,
    })
  }, [color])

  // Store material ref for frame updates
  useEffect(() => {
    materialRef.current = material
    return () => {
      material.dispose()
    }
  }, [material])

  // Reset fade state and ghost music when trajectory or game status changes
  useEffect(() => {
    fadeStartTime.current = null
    prevPosition.current = null
    prevTimer.current = 0
    prevSpeed.current = 0
    knockPulseTime.current = null
    ghostDroneStarted.current = false
    ghostState.reset()
    MusicEngine.get().stopAllGhostMusic()
  }, [trajectory, gameStatus])

  // Cleanup ghost music on unmount or when ghostEnabled toggles off
  useEffect(() => {
    if (!ghostEnabled) {
      MusicEngine.get().stopAllGhostMusic()
      ghostDroneStarted.current = false
    }
    return () => {
      MusicEngine.get().stopAllGhostMusic()
    }
  }, [ghostEnabled])

  const isPlaying = gameStatus === 'playing'
  const shouldRender = ghostEnabled && trajectory.length > 0

  useFrame(() => {
    if (!meshRef.current || !materialRef.current || !shouldRender || !isPlaying) {
      ghostState.active = false
      if (ghostDroneStarted.current) {
        MusicEngine.get().stopAllGhostMusic()
        ghostDroneStarted.current = false
      }
      return
    }

    const result = interpolateTrajectory(trajectory, timer)
    if (!result) {
      ghostState.active = false
      return
    }

    ghostState.active = true

    // --- Ghost speed computation from frame deltas ---
    let ghostSpeed = 0
    if (prevPosition.current !== null && timer > prevTimer.current) {
      const dt = timer - prevTimer.current
      const dx = result.x - prevPosition.current.x
      const dy = result.y - prevPosition.current.y
      const dz = result.z - prevPosition.current.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      ghostSpeed = dist / dt
    }

    // --- Ghost music triggers ---
    const music = MusicEngine.get()

    // Detect significant speed changes for knock triggers
    const speedDelta = Math.abs(ghostSpeed - prevSpeed.current)
    if (speedDelta > GHOST_KNOCK_SPEED_THRESHOLD && ghostSpeed < prevSpeed.current) {
      // Speed decreased significantly — likely a wall hit
      music.playGhostKnock(Math.min(10, speedDelta * 2), clampedWorldId)
      // Trigger opacity pulse
      knockPulseTime.current = timer
    }

    // Feed ghost speed to drone
    if (ghostSpeed > 0.1 && !result.pastEnd) {
      music.startGhostRoll(clampedWorldId)
      music.updateGhostSpeed(Math.min(10, ghostSpeed))
      ghostDroneStarted.current = true
    } else if (ghostDroneStarted.current && (ghostSpeed <= 0.1 || result.pastEnd)) {
      music.stopGhostRoll()
      ghostDroneStarted.current = false
    }

    // Store for next frame
    prevPosition.current = { x: result.x, y: result.y, z: result.z }
    prevTimer.current = timer
    prevSpeed.current = ghostSpeed

    // Handle fade-out when trajectory ends
    if (result.pastEnd) {
      if (fadeStartTime.current === null) {
        fadeStartTime.current = timer
        ghostState.finished = true
        ghostState.finishedAt = timer
        // Stop ghost music when trajectory ends
        music.stopAllGhostMusic()
        ghostDroneStarted.current = false
      }
      const elapsed = timer - fadeStartTime.current
      const fadeAlpha = Math.max(0, 1 - elapsed / GHOST_FADE_DURATION)
      const currentOpacity = GHOST_BASE_OPACITY * fadeAlpha
      materialRef.current.opacity = currentOpacity
      ghostState.opacity = currentOpacity

      if (fadeAlpha <= 0) {
        meshRef.current.visible = false
        ghostState.active = false
        return
      }
    } else {
      // Compute opacity with knock pulse
      let baseOpacity = GHOST_BASE_OPACITY

      // Apply knock pulse (briefly increase opacity)
      if (knockPulseTime.current !== null && !prefersReducedMotion()) {
        const pulseElapsed = timer - knockPulseTime.current
        if (pulseElapsed < KNOCK_PULSE_DURATION) {
          const pulseAlpha = 1 - pulseElapsed / KNOCK_PULSE_DURATION
          baseOpacity = GHOST_BASE_OPACITY + (KNOCK_OPACITY_PEAK - GHOST_BASE_OPACITY) * pulseAlpha
        } else {
          knockPulseTime.current = null
        }
      }

      materialRef.current.opacity = baseOpacity
      ghostState.opacity = baseOpacity
      meshRef.current.visible = true
    }

    // Update position
    meshRef.current.position.set(result.x, result.y, result.z)
    ghostState.position.set(result.x, result.y, result.z)

    // Update trail
    ghostState.updateTrail(result.x, result.y, result.z)
  })

  if (!shouldRender) return null

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[0.2, 24, 24]} />
    </mesh>
  )
}

// Export constants for testing
export { GHOST_KNOCK_SPEED_THRESHOLD, KNOCK_OPACITY_PEAK, KNOCK_PULSE_DURATION }
