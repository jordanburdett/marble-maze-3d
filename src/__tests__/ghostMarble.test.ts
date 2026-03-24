import { describe, it, expect, beforeEach } from 'vitest'
import { interpolateTrajectory, getGhostColor } from '../utils/ghostHelpers'
import { ghostState, GHOST_TRAIL_LENGTH } from '../utils/ghostState'
import type { TrajectoryFrame } from '../utils/trajectoryRecorder'

// --- Helper: create a simple trajectory ---
function makeTrajectory(count: number, duration: number = 10): TrajectoryFrame[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * 1.0,
    y: 0.3,
    z: i * 2.0,
    speed: 1.0,
    t: (i / (count - 1)) * duration,
  }))
}

// ============================================================
// interpolateTrajectory
// ============================================================

describe('interpolateTrajectory', () => {
  it('should return null for empty trajectory', () => {
    expect(interpolateTrajectory([], 0)).toBeNull()
  })

  it('should return first frame position at t=0', () => {
    const traj = makeTrajectory(5, 10)
    const result = interpolateTrajectory(traj, 0)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(0)
    expect(result!.y).toBe(0.3)
    expect(result!.z).toBe(0)
    expect(result!.pastEnd).toBe(false)
  })

  it('should return last frame position at trajectory end time', () => {
    const traj = makeTrajectory(5, 10)
    const result = interpolateTrajectory(traj, 10)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(4)
    expect(result!.y).toBe(0.3)
    expect(result!.z).toBe(8)
    expect(result!.pastEnd).toBe(true)
  })

  it('should interpolate position at midpoint', () => {
    const traj = makeTrajectory(5, 10)
    // At t=5.0, we're exactly at the midpoint (frame index 2.5)
    const result = interpolateTrajectory(traj, 5)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(2)
    expect(result!.y).toBe(0.3)
    expect(result!.z).toBe(4)
    expect(result!.pastEnd).toBe(false)
  })

  it('should lerp between two frames correctly', () => {
    const traj: TrajectoryFrame[] = [
      { x: 0, y: 0, z: 0, speed: 1, t: 0 },
      { x: 10, y: 5, z: 20, speed: 2, t: 1 },
    ]
    // At t=0.5, should be at midpoint between frames
    const result = interpolateTrajectory(traj, 0.5)
    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(5, 5)
    expect(result!.y).toBeCloseTo(2.5, 5)
    expect(result!.z).toBeCloseTo(10, 5)
    expect(result!.pastEnd).toBe(false)
  })

  it('should lerp at 25% between frames', () => {
    const traj: TrajectoryFrame[] = [
      { x: 0, y: 0, z: 0, speed: 1, t: 0 },
      { x: 100, y: 50, z: 200, speed: 2, t: 4 },
    ]
    const result = interpolateTrajectory(traj, 1)
    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(25, 5)
    expect(result!.y).toBeCloseTo(12.5, 5)
    expect(result!.z).toBeCloseTo(50, 5)
  })

  it('should return first frame for time before trajectory start', () => {
    const traj: TrajectoryFrame[] = [
      { x: 5, y: 1, z: 10, speed: 1, t: 2 },
      { x: 10, y: 2, z: 20, speed: 2, t: 4 },
    ]
    const result = interpolateTrajectory(traj, 0)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(5)
    expect(result!.y).toBe(1)
    expect(result!.z).toBe(10)
    expect(result!.pastEnd).toBe(false)
  })

  it('should mark pastEnd when time exceeds trajectory', () => {
    const traj = makeTrajectory(3, 5)
    const result = interpolateTrajectory(traj, 100)
    expect(result).not.toBeNull()
    expect(result!.pastEnd).toBe(true)
  })

  it('should handle single-frame trajectory at t=0', () => {
    const traj: TrajectoryFrame[] = [
      { x: 3, y: 1, z: 7, speed: 0, t: 0 },
    ]
    const result = interpolateTrajectory(traj, 0)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(3)
    expect(result!.pastEnd).toBe(true)
  })

  it('should handle single-frame trajectory at later time', () => {
    const traj: TrajectoryFrame[] = [
      { x: 3, y: 1, z: 7, speed: 0, t: 2 },
    ]
    const result = interpolateTrajectory(traj, 5)
    expect(result).not.toBeNull()
    expect(result!.x).toBe(3)
    expect(result!.pastEnd).toBe(true)
  })

  it('should handle many frames with binary search', () => {
    // Create 100 frames to exercise binary search
    const traj: TrajectoryFrame[] = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: 0,
      z: i * 2,
      speed: 1,
      t: i * 0.1,
    }))
    // At t=5.0, should be at frame index 50
    const result = interpolateTrajectory(traj, 5.0)
    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(50, 1)
    expect(result!.z).toBeCloseTo(100, 1)
  })

  it('should handle frames with equal timestamps', () => {
    const traj: TrajectoryFrame[] = [
      { x: 0, y: 0, z: 0, speed: 1, t: 0 },
      { x: 5, y: 1, z: 10, speed: 1, t: 0 },
      { x: 10, y: 2, z: 20, speed: 1, t: 1 },
    ]
    const result = interpolateTrajectory(traj, 0)
    expect(result).not.toBeNull()
    // Should return a valid position without dividing by zero
    expect(typeof result!.x).toBe('number')
    expect(Number.isFinite(result!.x)).toBe(true)
  })
})

// ============================================================
// getGhostColor
// ============================================================

describe('getGhostColor', () => {
  it('should return gold (#FFD700) for world 1', () => {
    expect(getGhostColor(1)).toBe('#FFD700')
  })

  it('should return cyan (#00E5CC) for world 2', () => {
    expect(getGhostColor(2)).toBe('#00E5CC')
  })

  it('should return orange (#FF8C00) for world 3', () => {
    expect(getGhostColor(3)).toBe('#FF8C00')
  })

  it('should return gold (#FFD700) for world 0 (daily/freeplay)', () => {
    expect(getGhostColor(0)).toBe('#FFD700')
  })

  it('should fallback to gold for unknown world ID', () => {
    expect(getGhostColor(99)).toBe('#FFD700')
  })
})

// ============================================================
// ghostState
// ============================================================

describe('ghostState', () => {
  beforeEach(() => {
    ghostState.reset()
  })

  describe('reset', () => {
    it('should set position to (0, -10, 0)', () => {
      ghostState.position.set(5, 3, 7)
      ghostState.reset()
      expect(ghostState.position.x).toBe(0)
      expect(ghostState.position.y).toBe(-10)
      expect(ghostState.position.z).toBe(0)
    })

    it('should set active to false', () => {
      ghostState.active = true
      ghostState.reset()
      expect(ghostState.active).toBe(false)
    })

    it('should set opacity to 0.35', () => {
      ghostState.opacity = 0
      ghostState.reset()
      expect(ghostState.opacity).toBe(0.35)
    })

    it('should set finished to false', () => {
      ghostState.finished = true
      ghostState.reset()
      expect(ghostState.finished).toBe(false)
    })

    it('should reset finishedAt to 0', () => {
      ghostState.finishedAt = 12.5
      ghostState.reset()
      expect(ghostState.finishedAt).toBe(0)
    })

    it('should reset trail positions to (0, -10, 0)', () => {
      ghostState.trailPositions[0].set(5, 3, 7)
      ghostState.reset()
      for (const p of ghostState.trailPositions) {
        expect(p.x).toBe(0)
        expect(p.y).toBe(-10)
        expect(p.z).toBe(0)
      }
    })

    it('should reset trail index and frame count', () => {
      ghostState.trailIndex = 5
      ghostState.trailFrameCount = 100
      ghostState.reset()
      expect(ghostState.trailIndex).toBe(0)
      expect(ghostState.trailFrameCount).toBe(0)
    })
  })

  describe('GHOST_TRAIL_LENGTH', () => {
    it('should be 12', () => {
      expect(GHOST_TRAIL_LENGTH).toBe(12)
    })

    it('should match the number of trail positions', () => {
      expect(ghostState.trailPositions.length).toBe(GHOST_TRAIL_LENGTH)
    })
  })

  describe('updateTrail', () => {
    it('should throttle to every 3rd frame', () => {
      // Call 6 times — only 2 should update
      for (let i = 0; i < 6; i++) {
        ghostState.updateTrail(i, 0, i)
      }
      // With throttle every 3rd: frames 3 and 6 store
      // Index should advance by 2
      expect(ghostState.trailIndex).toBe(2)
    })

    it('should update position in ring buffer', () => {
      // First two calls are throttled; third stores
      ghostState.updateTrail(1, 2, 3)
      ghostState.updateTrail(4, 5, 6)
      ghostState.updateTrail(7, 8, 9)
      // Third call stores at index 0
      const pos = ghostState.trailPositions[0]
      expect(pos.x).toBe(7)
      expect(pos.y).toBe(8)
      expect(pos.z).toBe(9)
    })

    it('should wrap around trail ring buffer', () => {
      // Fill entire buffer
      for (let i = 0; i < GHOST_TRAIL_LENGTH * 3; i++) {
        ghostState.updateTrail(i, 0, i)
      }
      // Index should wrap back to 0
      expect(ghostState.trailIndex).toBe(0)
    })
  })

  describe('ghost rendering conditions', () => {
    it('should not be active initially', () => {
      expect(ghostState.active).toBe(false)
    })

    it('should not be finished initially', () => {
      expect(ghostState.finished).toBe(false)
    })

    it('should track finished state separately from active', () => {
      ghostState.active = true
      ghostState.finished = true
      expect(ghostState.active).toBe(true)
      expect(ghostState.finished).toBe(true)
    })

    it('should allow setting opacity for fade effect', () => {
      ghostState.opacity = 0.15
      expect(ghostState.opacity).toBe(0.15)
    })
  })
})
