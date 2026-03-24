import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trailPositions, TRAIL_LENGTH } from '../utils/trailState'

const TRAIL_SPHERE_RADIUS = 0.04

/** World-specific trail colors */
const WORLD_TRAIL_COLORS: Record<number, string> = {
  0: '#D4A574', // Daily/Freeplay: amber
  1: '#D4A574', // Workshop: amber
  2: '#00D4FF', // Cavern: cyan
  3: '#FFD700', // Temple: gold
}

interface MarbleTrailProps {
  worldId: number
}

/**
 * Fading trail of small spheres behind the marble.
 * Uses a single InstancedMesh for performance (20 instances).
 * Reads positions from the shared trailPositions module.
 */
export function MarbleTrail({ worldId }: MarbleTrailProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempMatrix = useRef(new THREE.Matrix4())
  const tempColor = useRef(new THREE.Color())

  const color = WORLD_TRAIL_COLORS[worldId] ?? WORLD_TRAIL_COLORS[0]

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
    })
  }, [color])

  useFrame(() => {
    if (!meshRef.current) return

    const positions = trailPositions.positions
    const currentIdx = trailPositions.index

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const age = (currentIdx - i + TRAIL_LENGTH) % TRAIL_LENGTH
      const opacity = Math.max(0, 1 - age / TRAIL_LENGTH) * 0.5
      const scale = Math.max(0.1, 1 - age / TRAIL_LENGTH)

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

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TRAIL_LENGTH]}
      frustumCulled={false}
      material={material}
    >
      <sphereGeometry args={[TRAIL_SPHERE_RADIUS, 6, 6]} />
    </instancedMesh>
  )
}
