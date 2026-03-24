import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WindZoneDef } from '../data/levels'

const ARROW_COLOR = '#AADDFF'
const ARROW_SPEED = 2.0

interface WindZoneProps {
  def: WindZoneDef
}

/**
 * Wind zone visual indicator.
 * Renders faint arrow particles showing wind direction.
 * Actual force application is handled by the Marble component
 * detecting positional overlap.
 */
export function WindZone({ def }: WindZoneProps) {
  const arrowsRef = useRef<THREE.Group>(null)

  // Calculate arrow rotation from wind direction
  const arrowAngle = useMemo(() => {
    return Math.atan2(def.direction[0], def.direction[1])
  }, [def.direction])

  // Animate arrow opacity for "flowing" effect
  useFrame((state) => {
    if (!arrowsRef.current) return
    const t = state.clock.elapsedTime * ARROW_SPEED
    arrowsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      // Stagger each arrow's pulse
      mat.opacity = 0.1 + 0.15 * Math.sin(t + i * 1.2)
    })
  })

  // Create arrow positions along the wind direction
  const arrows = useMemo(() => {
    const positions: Array<[number, number]> = []
    const count = 3
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1) - 0.5
      // Spread arrows perpendicular to wind direction
      const perpX = -def.direction[1]
      const perpZ = def.direction[0]
      positions.push([perpX * t * def.size[0] * 0.5, perpZ * t * def.size[1] * 0.5])
    }
    return positions
  }, [def.direction, def.size])

  return (
    <group position={[def.position[0], 0.02, def.position[1]]}>
      {/* Zone boundary indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[def.size[0], def.size[1]]} />
        <meshBasicMaterial
          color={ARROW_COLOR}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {/* Arrow particles */}
      <group ref={arrowsRef}>
        {arrows.map(([ox, oz], i) => (
          <mesh
            key={`wind-arrow-${i}`}
            position={[ox, 0.01, oz]}
            rotation={[-Math.PI / 2, 0, arrowAngle]}
          >
            <planeGeometry args={[0.3, 0.5]} />
            <meshBasicMaterial
              color={ARROW_COLOR}
              transparent
              opacity={0.15}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
