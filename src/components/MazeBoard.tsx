import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Level } from '../data/levels'

const FLOOR_THICKNESS = 0.1
const DEFAULT_WALL_HEIGHT = 0.4
const DEFAULT_WALL_THICKNESS = 0.15
const TRAP_RADIUS = 0.3
const GOAL_RADIUS = 0.35

interface MazeBoardProps {
  level: Level
  tiltRef: React.RefObject<{ tiltX: number; tiltZ: number }>
  enabled: boolean
}

/** Convert a wall segment [x1,z1,x2,z2] to box position + dimensions */
function wallToBox(
  seg: [number, number, number, number],
  thickness: number,
  height: number,
): { position: [number, number, number]; scale: [number, number, number] } {
  const [x1, z1, x2, z2] = seg

  if (x1 === x2) {
    // Vertical wall
    const len = Math.abs(z2 - z1)
    return {
      position: [x1, height / 2, (z1 + z2) / 2],
      scale: [thickness, height, len],
    }
  } else if (z1 === z2) {
    // Horizontal wall
    const len = Math.abs(x2 - x1)
    return {
      position: [(x1 + x2) / 2, height / 2, z1],
      scale: [len, height, thickness],
    }
  } else {
    // Diagonal — approximate as axis-aligned
    const dx = x2 - x1
    const dz = z2 - z1
    return {
      position: [(x1 + x2) / 2, height / 2, (z1 + z2) / 2],
      scale: [Math.max(Math.abs(dx), thickness), height, Math.max(Math.abs(dz), thickness)],
    }
  }
}

export function MazeBoard({ level, tiltRef, enabled }: MazeBoardProps) {
  const boardRef = useRef<RapierRigidBody>(null)
  const goalRingRef = useRef<THREE.Mesh>(null)

  const wallHeight = level.wallHeight ?? DEFAULT_WALL_HEIGHT
  const wallThickness = level.wallThickness ?? DEFAULT_WALL_THICKNESS
  const [boardW, boardD] = level.boardSize

  // Pre-compute wall boxes
  const wallBoxes = useMemo(
    () => level.walls.map(seg => wallToBox(seg, wallThickness, wallHeight)),
    [level.walls, wallThickness, wallHeight],
  )

  // Create instanced mesh data for walls
  const wallMatrices = useMemo(() => {
    const matrices: THREE.Matrix4[] = []
    for (const box of wallBoxes) {
      const m = new THREE.Matrix4()
      m.compose(
        new THREE.Vector3(...box.position),
        new THREE.Quaternion(),
        new THREE.Vector3(...box.scale),
      )
      matrices.push(m)
    }
    return matrices
  }, [wallBoxes])

  // Animate goal ring pulse
  useFrame((_state, delta) => {
    if (goalRingRef.current) {
      goalRingRef.current.rotation.y += delta * 0.5
    }
  })

  // Reusable objects for tilt calculation — hoisted to avoid per-frame allocation
  const tiltQuat = useRef(new THREE.Quaternion())
  const tiltEuler = useRef(new THREE.Euler(0, 0, 0, 'XYZ'))

  // Update board tilt each physics frame
  useFrame(() => {
    if (!boardRef.current || !enabled) return
    const tilt = tiltRef.current
    if (!tilt) return

    tiltEuler.current.set(tilt.tiltX, 0, tilt.tiltZ, 'XYZ')
    tiltQuat.current.setFromEuler(tiltEuler.current)

    const q = tiltQuat.current
    boardRef.current.setNextKinematicRotation(
      { x: q.x, y: q.y, z: q.z, w: q.w },
    )
  })

  return (
    <RigidBody
      ref={boardRef}
      type="kinematicPosition"
      position={[0, 0, 0]}
      colliders={false}
    >
      {/* Floor */}
      <mesh position={[0, -FLOOR_THICKNESS / 2, 0]} receiveShadow={false}>
        <boxGeometry args={[boardW, FLOOR_THICKNESS, boardD]} />
        <meshStandardMaterial color="#E8D5B7" roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Floor collider — explicit CuboidCollider so Rapier generates physics shapes */}
      <CuboidCollider
        args={[boardW / 2, FLOOR_THICKNESS / 2, boardD / 2]}
        position={[0, -FLOOR_THICKNESS / 2, 0]}
      />

      {/* Wall instances using InstancedMesh for performance */}
      {wallMatrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, wallMatrices.length]}
          ref={(mesh) => {
            if (mesh) {
              wallMatrices.forEach((m, i) => mesh.setMatrixAt(i, m))
              mesh.instanceMatrix.needsUpdate = true
            }
          }}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#C4883C" roughness={0.6} metalness={0.1} />
        </instancedMesh>
      )}

      {/* Individual wall colliders — explicit CuboidColliders for physics */}
      {wallBoxes.map((box, i) => (
        <CuboidCollider
          key={`wall-col-${i}`}
          args={[box.scale[0] / 2, box.scale[1] / 2, box.scale[2] / 2]}
          position={box.position}
        />
      ))}

      {/* Ambient occlusion strips at wall bases */}
      {wallBoxes.map((box, i) => (
        <mesh
          key={`ao-${i}`}
          position={[box.position[0], 0.001, box.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[box.scale[0] + 0.1, box.scale[2] + 0.1]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Goal */}
      <mesh
        ref={goalRingRef}
        position={[level.goalPosition[0], 0.02, level.goalPosition[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[GOAL_RADIUS - 0.08, GOAL_RADIUS, 32]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Goal inner glow */}
      <mesh
        position={[level.goalPosition[0], 0.01, level.goalPosition[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[GOAL_RADIUS - 0.08, 32]} />
        <meshBasicMaterial color="#FFF8DC" transparent opacity={0.4} />
      </mesh>

      {/* Trap holes */}
      {level.traps.map((trap, i) => (
        <group key={`trap-${i}`}>
          {/* Dark pit visual */}
          <mesh
            position={[trap[0], 0.005, trap[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[TRAP_RADIUS, 32]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          {/* Red glow rim */}
          <mesh
            position={[trap[0], 0.006, trap[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[TRAP_RADIUS - 0.04, TRAP_RADIUS, 32]} />
            <meshBasicMaterial
              color="#FF4444"
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      ))}

    </RigidBody>
  )
}

/** Goal sensor — separate RigidBody since sensors on kinematic bodies need special handling */
export function GoalSensor({
  position,
  onGoalReach,
  resetTrigger,
}: {
  position: [number, number]
  onGoalReach: () => void
  resetTrigger?: number
}) {
  const reachedRef = useRef(false)

  useEffect(() => {
    reachedRef.current = false
  }, [position, resetTrigger])

  return (
    <RigidBody
      type="fixed"
      position={[position[0], 0.15, position[1]]}
      sensor
      onIntersectionEnter={() => {
        if (!reachedRef.current) {
          reachedRef.current = true
          onGoalReach()
        }
      }}
    >
      <mesh visible={false}>
        <sphereGeometry args={[GOAL_RADIUS, 8, 8]} />
      </mesh>
    </RigidBody>
  )
}

/** Trap sensor — separate RigidBody for each trap hole */
export function TrapSensor({
  position,
  onTrapEnter,
}: {
  position: [number, number]
  onTrapEnter: () => void
}) {
  return (
    <RigidBody
      type="fixed"
      position={[position[0], 0.1, position[1]]}
      sensor
      onIntersectionEnter={() => {
        onTrapEnter()
      }}
    >
      <mesh visible={false}>
        <sphereGeometry args={[TRAP_RADIUS * 0.8, 8, 8]} />
      </mesh>
    </RigidBody>
  )
}
