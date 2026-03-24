import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Environment } from '@react-three/drei'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'

const MARBLE_RADIUS = 0.2
const VELOCITY_THRESHOLD = 0.05 // minimum velocity to start timer
const CAMERA_LERP = 3.0

interface MarbleProps {
  startPosition: [number, number]
  onFallOff: () => void
  onStartMoving: () => void
  resetTrigger: number
}

export function Marble({ startPosition, onFallOff, onStartMoving, resetTrigger }: MarbleProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const hasStartedMoving = useRef(false)
  const hasFallenOff = useRef(false)
  const cameraTarget = useRef(new THREE.Vector3(startPosition[0], 0, startPosition[1]))

  // Reusable Vector3 objects — hoisted to avoid per-frame allocation
  const tempMarbleXZ = useRef(new THREE.Vector3())
  const tempCamPos = useRef(new THREE.Vector3())

  // Reset marble position when resetTrigger changes
  useEffect(() => {
    if (!bodyRef.current) return
    const body = bodyRef.current
    body.setTranslation(
      { x: startPosition[0], y: MARBLE_RADIUS + 0.1, z: startPosition[1] },
      true,
    )
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    hasStartedMoving.current = false
    hasFallenOff.current = false
    cameraTarget.current.set(startPosition[0], 0, startPosition[1])
  }, [resetTrigger, startPosition])

  useFrame((state, delta) => {
    if (!bodyRef.current) return
    const body = bodyRef.current
    const pos = body.translation()
    const vel = body.linvel()

    // Check if marble fell off the board (only fire once per fall)
    if (pos.y < -2) {
      if (!hasFallenOff.current) {
        hasFallenOff.current = true
        onFallOff()
      }
      return
    }

    // Check if marble started moving
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
    if (!hasStartedMoving.current && speed > VELOCITY_THRESHOLD) {
      hasStartedMoving.current = true
      onStartMoving()
    }

    // Camera follows marble with smooth lerp
    tempMarbleXZ.current.set(pos.x, 0, pos.z)
    cameraTarget.current.lerp(tempMarbleXZ.current, CAMERA_LERP * delta)

    const cam = state.camera
    tempCamPos.current.set(
      cameraTarget.current.x,
      8,
      cameraTarget.current.z + 6,
    )
    cam.position.lerp(tempCamPos.current, CAMERA_LERP * delta)
    cam.lookAt(cameraTarget.current.x, 0, cameraTarget.current.z)
  })

  return (
    <>
      <Environment preset="sunset" />
      <RigidBody
        ref={bodyRef}
        type="dynamic"
        position={[startPosition[0], MARBLE_RADIUS + 0.1, startPosition[1]]}
        colliders="ball"
        mass={1}
        restitution={0.3}
        friction={0.6}
        linearDamping={0.5}
        angularDamping={0.3}
      >
        <mesh castShadow={false}>
          <sphereGeometry args={[MARBLE_RADIUS, 32, 32]} />
          <meshStandardMaterial
            color="#88ccff"
            metalness={0.9}
            roughness={0.1}
            envMapIntensity={1.0}
          />
        </mesh>
      </RigidBody>
    </>
  )
}
