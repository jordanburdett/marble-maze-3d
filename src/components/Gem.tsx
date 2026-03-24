import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { Mesh } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

const GEM_COLORS = ['#50C878', '#2E5090', '#E0115F'] as const // emerald, sapphire, ruby
const GEM_FLOAT_HEIGHT = 0.6
const GEM_ROTATION_SPEED = 1.5

interface GemProps {
  position: [number, number]
  index: number
  collected: boolean
  onCollect: () => void
}

export function Gem({ position, index, collected, onCollect }: GemProps) {
  const meshRef = useRef<Mesh>(null)
  const bodyRef = useRef<RapierRigidBody>(null)
  const collectedRef = useRef(false)

  // Reset collectedRef when the collected prop changes to false (level restart)
  useEffect(() => {
    if (!collected) {
      collectedRef.current = false
    }
  }, [collected])

  const reducedMotionActive = useMemo(() => prefersReducedMotion(), [])
  useFrame((_state, delta) => {
    if (collected || collectedRef.current || !meshRef.current || reducedMotionActive) return
    meshRef.current.rotation.y += GEM_ROTATION_SPEED * delta
  })

  if (collected) return null

  const color = GEM_COLORS[index % GEM_COLORS.length]

  return (
    <RigidBody
      ref={bodyRef}
      type="fixed"
      position={[position[0], GEM_FLOAT_HEIGHT, position[1]]}
      sensor
      onIntersectionEnter={() => {
        if (!collectedRef.current) {
          collectedRef.current = true
          onCollect()
        }
      }}
    >
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </RigidBody>
  )
}
