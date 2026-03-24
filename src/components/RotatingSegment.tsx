import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { RotatingSegmentDef } from '../data/levels'

const SPOKE_HEIGHT = 0.3
const SPOKE_WIDTH = 0.12

interface RotatingSegmentProps {
  def: RotatingSegmentDef
  enabled: boolean
}

/**
 * Circular spinning platform section.
 * Uses a kinematic RigidBody that rotates at a constant speed.
 * Has a flat disc base with protruding spoke walls.
 */
export function RotatingSegment({ def, enabled }: RotatingSegmentProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const angleRef = useRef(0)
  const quatRef = useRef(new THREE.Quaternion())

  useFrame((_state, delta) => {
    if (!bodyRef.current || !enabled) return

    angleRef.current += def.speed * delta
    quatRef.current.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angleRef.current,
    )

    const q = quatRef.current
    bodyRef.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={[def.position[0], SPOKE_HEIGHT / 2, def.position[1]]}
      colliders={false}
    >
      {/* Visual: rotating disc (purely decorative ring on floor) */}
      <mesh position={[0, -SPOKE_HEIGHT / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[def.radius * 0.3, def.radius, 32]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.2}
          transparent
          opacity={0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Cross-shaped spoke walls for physics interaction */}
      {/* Spoke 1: along X */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[def.radius * 2, SPOKE_HEIGHT, SPOKE_WIDTH]} />
        <meshStandardMaterial color="#B8860B" roughness={0.5} metalness={0.3} />
      </mesh>
      <CuboidCollider args={[def.radius, SPOKE_HEIGHT / 2, SPOKE_WIDTH / 2]} />

      {/* Spoke 2: along Z */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[SPOKE_WIDTH, SPOKE_HEIGHT, def.radius * 2]} />
        <meshStandardMaterial color="#B8860B" roughness={0.5} metalness={0.3} />
      </mesh>
      <CuboidCollider args={[SPOKE_WIDTH / 2, SPOKE_HEIGHT / 2, def.radius]} />
    </RigidBody>
  )
}
