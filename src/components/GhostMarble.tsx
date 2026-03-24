import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TrajectoryFrame } from '../utils/trajectoryRecorder'
import { ghostState } from '../utils/ghostState'
import { interpolateTrajectory, GHOST_BASE_OPACITY, GHOST_FADE_DURATION } from '../utils/ghostHelpers'
import type { GameStatus } from '../store/gameStore'
import { getGhostColor } from '../utils/ghostHelpers'

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
      materialRef.current.opacity = GHOST_BASE_OPACITY
      ghostState.opacity = GHOST_BASE_OPACITY
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
