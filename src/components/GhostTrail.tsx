import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ghostState, GHOST_TRAIL_LENGTH } from '../utils/ghostState'
import { getGhostColor } from './GhostMarble'
import { useReducedMotion } from '../hooks/useReducedMotion'

const GHOST_TRAIL_RADIUS = 0.03
const MAX_OPACITY = 0.25

interface GhostTrailProps {
  worldId: number
}

/**
 * Fading trail behind the ghost marble.
 * Same InstancedMesh pattern as MarbleTrail.tsx but lighter:
 * 12 trail points (vs 20), radius 0.03 (smaller), max opacity 0.25.
 * Respects prefers-reduced-motion by not rendering.
 */
export function GhostTrail({ worldId }: GhostTrailProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempMatrix = useRef(new THREE.Matrix4())
  const tempColor = useRef(new THREE.Color())
  const reducedMotion = useReducedMotion()

  const color = getGhostColor(worldId)

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
    })
  }, [color])

  // Dispose material on unmount
  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useFrame(() => {
    if (!meshRef.current || reducedMotion || !ghostState.active) {
      // Hide all instances when inactive
      if (meshRef.current) {
        for (let i = 0; i < GHOST_TRAIL_LENGTH; i++) {
          tempMatrix.current.identity()
          tempMatrix.current.makeScale(0, 0, 0)
          tempMatrix.current.setPosition(0, -10, 0)
          meshRef.current.setMatrixAt(i, tempMatrix.current)
        }
        meshRef.current.instanceMatrix.needsUpdate = true
      }
      return
    }

    const positions = ghostState.trailPositions
    const currentIdx = ghostState.trailIndex

    for (let i = 0; i < GHOST_TRAIL_LENGTH; i++) {
      const age = (currentIdx - i + GHOST_TRAIL_LENGTH) % GHOST_TRAIL_LENGTH
      const opacity = Math.max(0, 1 - age / GHOST_TRAIL_LENGTH) * MAX_OPACITY * (ghostState.opacity / 0.35)
      const scale = Math.max(0.1, 1 - age / GHOST_TRAIL_LENGTH)

      const pos = positions[i]
      tempMatrix.current.identity()
      tempMatrix.current.makeScale(scale, scale, scale)
      tempMatrix.current.setPosition(pos.x, pos.y, pos.z)
      meshRef.current.setMatrixAt(i, tempMatrix.current)

      tempColor.current.set(color)
      tempColor.current.multiplyScalar(opacity)
      meshRef.current.setColorAt(i, tempColor.current)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  // Skip rendering entirely when reduced motion is preferred
  if (reducedMotion) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, GHOST_TRAIL_LENGTH]}
      frustumCulled={false}
      material={material}
    >
      <sphereGeometry args={[GHOST_TRAIL_RADIUS, 6, 6]} />
    </instancedMesh>
  )
}
