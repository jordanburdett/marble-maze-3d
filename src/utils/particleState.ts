/**
 * Shared particle state for the particle system.
 * Components emit particles through the emitter, and the
 * ConnectedParticleSystem component renders them.
 */
import * as THREE from 'three'

export const MAX_PARTICLES = 30

export interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  color: THREE.Color
  active: boolean
}

export function createParticles(): Particle[] {
  return Array.from({ length: MAX_PARTICLES }, () => ({
    position: new THREE.Vector3(0, -100, 0),
    velocity: new THREE.Vector3(),
    life: 0,
    maxLife: 0,
    color: new THREE.Color('#ffffff'),
    active: false,
  }))
}

/**
 * Shared particle emitter.
 * Call emit() from anywhere to spawn particles.
 */
export const particleEmitter = {
  _particles: null as Particle[] | null,

  /** Find next available particle slot */
  _findSlot(): number {
    if (!this._particles) return -1
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this._particles[i].active) return i
    }
    // Overwrite oldest (shortest remaining life)
    let oldestIdx = 0
    let smallestLife = Infinity
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this._particles[i].life < smallestLife) {
        smallestLife = this._particles[i].life
        oldestIdx = i
      }
    }
    return oldestIdx
  },

  /** Emit a burst of particles at a position */
  emit(
    x: number, y: number, z: number,
    count: number,
    color: string,
    speed: number,
    life: number,
    upBias: number = 0,
  ): void {
    if (!this._particles) return
    const clr = new THREE.Color(color)

    for (let i = 0; i < count; i++) {
      const idx = this._findSlot()
      if (idx < 0) return

      const p = this._particles[idx]
      p.position.set(x, y, z)
      p.velocity.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.5 + upBias,
        (Math.random() - 0.5) * speed,
      )
      p.life = life * (0.7 + Math.random() * 0.3)
      p.maxLife = p.life
      p.color.copy(clr)
      p.active = true
    }
  },
}

/** Emit gem collect particles */
export function emitGemCollect(x: number, y: number, z: number, gemIndex: number): void {
  const colors = ['#50C878', '#2E5090', '#E0115F']
  const color = colors[gemIndex % colors.length]
  particleEmitter.emit(x, y, z, 15, color, 3, 0.5, 2)
}

/** Emit goal reached fountain */
export function emitGoalFountain(x: number, y: number, z: number): void {
  particleEmitter.emit(x, y, z, 20, '#FFD700', 2.5, 0.8, 4)
}
