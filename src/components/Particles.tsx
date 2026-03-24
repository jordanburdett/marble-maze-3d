import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MAX_PARTICLES, particleEmitter, createParticles } from '../utils/particleState'
import type { Particle } from '../utils/particleState'

/**
 * ParticleSystem that connects to the shared emitter.
 * Place this once in the scene. Uses an InstancedMesh for
 * all particles capped at MAX_PARTICLES.
 */
export function ConnectedParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const particlesRef = useRef<Particle[]>(createParticles())
  const tempMatrix = useRef(new THREE.Matrix4())

  // Register particles with the shared emitter on mount
  useEffect(() => {
    particleEmitter._particles = particlesRef.current
    return () => {
      particleEmitter._particles = null
    }
  }, [])

  useFrame((_state, delta) => {
    if (!meshRef.current) return
    const dt = Math.min(delta, 0.05)
    const particles = particlesRef.current

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i]
      if (!p.active) {
        tempMatrix.current.identity()
        tempMatrix.current.setPosition(0, -100, 0)
        meshRef.current.setMatrixAt(i, tempMatrix.current)
        continue
      }

      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        tempMatrix.current.identity()
        tempMatrix.current.setPosition(0, -100, 0)
        meshRef.current.setMatrixAt(i, tempMatrix.current)
        continue
      }

      // Gravity
      p.velocity.y -= 4 * dt

      // Update position
      p.position.x += p.velocity.x * dt
      p.position.y += p.velocity.y * dt
      p.position.z += p.velocity.z * dt

      // Scale down as life decreases
      const t = p.life / p.maxLife
      const scale = t * 0.8

      tempMatrix.current.identity()
      tempMatrix.current.makeScale(scale, scale, scale)
      tempMatrix.current.setPosition(p.position.x, p.position.y, p.position.z)
      meshRef.current.setMatrixAt(i, tempMatrix.current)
      meshRef.current.setColorAt(i, p.color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial transparent depthWrite={false} />
    </instancedMesh>
  )
}
