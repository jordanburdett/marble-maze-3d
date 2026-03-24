/**
 * Shared mutable state for the marble trail.
 * Written by Marble each frame, read by MarbleTrail for rendering.
 */
import * as THREE from 'three'

export const TRAIL_LENGTH = 20

export const trailPositions = {
  positions: Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(0, -10, 0)),
  index: 0,
  frameCount: 0,

  update(x: number, y: number, z: number): void {
    this.frameCount++
    if (this.frameCount % 3 !== 0) return
    this.positions[this.index].set(x, y, z)
    this.index = (this.index + 1) % TRAIL_LENGTH
  },

  reset(): void {
    for (const p of this.positions) {
      p.set(0, -10, 0)
    }
    this.index = 0
    this.frameCount = 0
  },
}
