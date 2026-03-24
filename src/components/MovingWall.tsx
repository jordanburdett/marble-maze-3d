import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { MovingWallDef } from '../data/levels'

const WALL_HEIGHT = 0.4
const WALL_THICKNESS = 0.15
const GLOW_COLOR = '#00D4FF'

interface MovingWallProps {
  def: MovingWallDef
  enabled: boolean
}

/**
 * Kinematic RigidBody wall that slides between start and end positions.
 * Renders with a cyan glow outline (#00D4FF at 20% opacity).
 */
export function MovingWall({ def, enabled }: MovingWallProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const progressRef = useRef(0)
  const directionRef = useRef(1)

  const wallDims = useMemo(() => {
    if (def.orientation === 'h') {
      return { width: def.length, depth: WALL_THICKNESS, height: WALL_HEIGHT }
    }
    return { width: WALL_THICKNESS, depth: def.length, height: WALL_HEIGHT }
  }, [def.length, def.orientation])

  useFrame((_state, delta) => {
    if (!bodyRef.current || !enabled) return

    // Advance progress along the path
    const totalDist = Math.sqrt(
      (def.end[0] - def.start[0]) ** 2 + (def.end[1] - def.start[1]) ** 2,
    )
    const step = (def.speed * delta) / totalDist

    progressRef.current += step * directionRef.current
    if (progressRef.current >= 1) {
      progressRef.current = 1
      directionRef.current = -1
    } else if (progressRef.current <= 0) {
      progressRef.current = 0
      directionRef.current = 1
    }

    const t = progressRef.current
    const x = def.start[0] + (def.end[0] - def.start[0]) * t
    const z = def.start[1] + (def.end[1] - def.start[1]) * t

    bodyRef.current.setNextKinematicTranslation({ x, y: WALL_HEIGHT / 2, z })
  })

  const startX = def.start[0]
  const startZ = def.start[1]

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={[startX, WALL_HEIGHT / 2, startZ]}
      colliders={false}
    >
      {/* Solid wall mesh */}
      <mesh>
        <boxGeometry args={[wallDims.width, wallDims.height, wallDims.depth]} />
        <meshStandardMaterial
          color="#6688AA"
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Glow outline */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <boxGeometry args={[wallDims.width, wallDims.height, wallDims.depth]} />
        <meshBasicMaterial
          color={GLOW_COLOR}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Collider */}
      <CuboidCollider
        args={[wallDims.width / 2, wallDims.height / 2, wallDims.depth / 2]}
      />
    </RigidBody>
  )
}
