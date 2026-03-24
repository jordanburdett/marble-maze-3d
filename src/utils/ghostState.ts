/**
 * Shared mutable state for the ghost marble system.
 * Written by GhostMarble each frame, read by GhostTrail for rendering.
 * Follows the same pattern as trailState.ts — mutable shared singleton.
 */
import * as THREE from 'three'

export const GHOST_TRAIL_LENGTH = 12

export const ghostState = {
  /** Current interpolated ghost position */
  position: new THREE.Vector3(0, -10, 0),

  /** Whether the ghost is currently active (visible and replaying) */
  active: false,

  /** Current opacity (fades out at end of trajectory) */
  opacity: 0.35,

  /** Whether the ghost has finished its trajectory */
  finished: false,

  /** The time at which the ghost finished (for HUD flash) */
  finishedAt: 0,

  /** Trail ring buffer positions */
  trailPositions: Array.from({ length: GHOST_TRAIL_LENGTH }, () => new THREE.Vector3(0, -10, 0)),
  trailIndex: 0,
  trailFrameCount: 0,

  /** Update trail ring buffer with current ghost position */
  updateTrail(x: number, y: number, z: number): void {
    this.trailFrameCount++
    if (this.trailFrameCount % 3 !== 0) return
    this.trailPositions[this.trailIndex].set(x, y, z)
    this.trailIndex = (this.trailIndex + 1) % GHOST_TRAIL_LENGTH
  },

  /** Reset all ghost state */
  reset(): void {
    this.position.set(0, -10, 0)
    this.active = false
    this.opacity = 0.35
    this.finished = false
    this.finishedAt = 0
    this.trailIndex = 0
    this.trailFrameCount = 0
    for (const p of this.trailPositions) {
      p.set(0, -10, 0)
    }
  },
}
