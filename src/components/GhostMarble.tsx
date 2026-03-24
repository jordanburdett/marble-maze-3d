import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TrajectoryFrame } from '../utils/trajectoryRecorder'
import { ghostState } from '../utils/ghostState'
import type { GameStatus } from '../store/gameStore'

/** World-specific ghost colors */
const WORLD_GHOST_COLORS: Record<number, string> = {
  0: '#FFD700', // Daily/Freeplay: gold
  1: '#FFD700', // World 1: gold
  2: '#00E5CC', // World 2: cyan
  3: '#FF8C00', // World 3: orange
}

/** Get ghost color for a world */
export function getGhostColor(worldId: number): string {
  return WORLD_GHOST_COLORS[worldId] ?? WORLD_GHOST_COLORS[0]
}

/** Duration of fade-out when ghost finishes (seconds) */
const FADE_DURATION = 0.5

/** Base opacity for the ghost marble */
const BASE_OPACITY = 0.35

interface GhostMarbleProps {
  trajectory: TrajectoryFrame[]
  worldId: number
  ghostEnabled: boolean
  gameStatus: GameStatus
  timer: number
}

/**
 * Find the two bracketing frames for a given time and interpolate position.
 * Returns null if time is before first frame or after last frame.
 */
export function interpolateTrajectory(
  trajectory: TrajectoryFrame[],
  time: number,
): { x: number; y: number; z: number; pastEnd: boolean } | null {
  if (trajectory.length === 0) return null

  const first = trajectory[0]
  const last = trajectory[trajectory.length - 1]

  // Before trajectory starts
  if (time < first.t) {
    return { x: first.x, y: first.y, z: first.z, pastEnd: false }
  }

  // Past the end of trajectory
  if (time >= last.t) {
    return { x: last.x, y: last.y, z: last.z, pastEnd: true }
  }

  // Binary search for bracketing frames
  let lo = 0
  let hi = trajectory.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (trajectory[mid].t <= time) {
      lo = mid
    } else {
      hi = mid
    }
  }

  const a = trajectory[lo]
  const b = trajectory[hi]
  const dt = b.t - a.t
  const alpha = dt > 0 ? (time - a.t) / dt : 0

  return {
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    z: a.z + (b.z - a.z) * alpha,
    pastEnd: false,
  }
}

/**
 * NON-PHYSICS translucent ghost marble that replays a stored trajectory.
 * Purely visual — no RigidBody, no collisions.
 */
export function GhostMarble({ trajectory, worldId, ghostEnabled, gameStatus, timer }: GhostMarbleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const fadeStartTime = useRef<number | null>(null)

  const color = getGhostColor(worldId)

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: BASE_OPACITY,
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

  // Reset fade state when trajectory or game status changes
  useEffect(() => {
    fadeStartTime.current = null
    ghostState.reset()
  }, [trajectory, gameStatus])

  const isPlaying = gameStatus === 'playing'
  const shouldRender = ghostEnabled && trajectory.length > 0

  useFrame(() => {
    if (!meshRef.current || !materialRef.current || !shouldRender || !isPlaying) {
      ghostState.active = false
      return
    }

    const result = interpolateTrajectory(trajectory, timer)
    if (!result) {
      ghostState.active = false
      return
    }

    ghostState.active = true

    // Handle fade-out when trajectory ends
    if (result.pastEnd) {
      if (fadeStartTime.current === null) {
        fadeStartTime.current = timer
        ghostState.finished = true
        ghostState.finishedAt = timer
      }
      const elapsed = timer - fadeStartTime.current
      const fadeAlpha = Math.max(0, 1 - elapsed / FADE_DURATION)
      const currentOpacity = BASE_OPACITY * fadeAlpha
      materialRef.current.opacity = currentOpacity
      ghostState.opacity = currentOpacity

      if (fadeAlpha <= 0) {
        meshRef.current.visible = false
        ghostState.active = false
        return
      }
    } else {
      materialRef.current.opacity = BASE_OPACITY
      ghostState.opacity = BASE_OPACITY
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
