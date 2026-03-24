/**
 * wallGlowState — Shared mutable state for wall emissive glow on musical knock.
 * When MusicEngine plays a musical knock, it triggers a glow on a random wall index.
 * MazeBoard reads this state each frame and applies the emissive pulse.
 *
 * World accent colors:
 *   W1: warm amber (#FFB347)
 *   W2: cool cyan (#00D4FF)
 *   W3: gold (#FFD700)
 */

export const WORLD_GLOW_COLORS: Record<number, [number, number, number]> = {
  1: [1.0, 0.702, 0.278],  // #FFB347 warm amber
  2: [0.0, 0.831, 1.0],    // #00D4FF cool cyan
  3: [1.0, 0.843, 0.0],    // #FFD700 gold
}

export const wallGlowState = {
  /** Index of the wall currently glowing (-1 = none) */
  wallIndex: -1,
  /** Glow intensity (0-1), decays over ~200ms */
  intensity: 0,
  /** Timestamp when glow started (performance.now() or 0) */
  startTime: 0,
  /** Duration of glow in ms */
  duration: 200,
  /** World ID for color lookup */
  worldId: 1 as number,

  /** Trigger a glow on a specific wall index */
  trigger(wallIndex: number, worldId: number): void {
    this.wallIndex = wallIndex
    this.intensity = 1.0
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.worldId = worldId
  },

  /** Update intensity based on elapsed time. Returns current intensity (0 when expired). */
  update(): number {
    if (this.intensity <= 0) return 0

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsed = now - this.startTime
    if (elapsed >= this.duration) {
      this.intensity = 0
      this.wallIndex = -1
      return 0
    }

    // Linear decay
    this.intensity = 1.0 - elapsed / this.duration
    return this.intensity
  },

  /** Reset for testing */
  reset(): void {
    this.wallIndex = -1
    this.intensity = 0
    this.startTime = 0
    this.worldId = 1
  },
}
