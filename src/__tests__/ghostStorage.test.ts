import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ghostStorage } from '../utils/ghostStorage'
import type { TrajectoryFrame } from '../utils/trajectoryRecorder'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    /** Access raw store for assertions */
    _store: () => store,
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

function makeTrajectory(count: number): TrajectoryFrame[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * 1.123,
    y: i * 0.5,
    z: i * 2.456,
    speed: i * 0.1,
    t: i * 0.05,
  }))
}

describe('ghostStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('saveGhost / loadGhost round-trip', () => {
    it('should save and load a ghost trajectory', () => {
      const trajectory = makeTrajectory(5)
      const saved = ghostStorage.saveGhost(1, trajectory, 12.34)
      expect(saved).toBe(true)

      const loaded = ghostStorage.loadGhost(1)
      expect(loaded).not.toBeNull()
      expect(loaded!.time).toBe(12.34)
      expect(loaded!.trajectory).toHaveLength(5)
    })

    it('should round coordinates to 2 decimal places', () => {
      const trajectory: TrajectoryFrame[] = [
        { x: 1.12345, y: 2.67891, z: 3.99999, speed: 0.12345, t: 0.56789 },
      ]
      ghostStorage.saveGhost(1, trajectory, 10.0)
      const loaded = ghostStorage.loadGhost(1)
      expect(loaded).not.toBeNull()
      const f = loaded!.trajectory[0]
      expect(f.x).toBe(1.12)
      expect(f.y).toBe(2.68)
      expect(f.z).toBe(4.0)
      expect(f.speed).toBe(0.12)
      expect(f.t).toBe(0.57)
    })

    it('should return null for a level with no ghost', () => {
      expect(ghostStorage.loadGhost(999)).toBeNull()
    })

    it('should handle empty trajectory', () => {
      ghostStorage.saveGhost(1, [], 5.0)
      const loaded = ghostStorage.loadGhost(1)
      expect(loaded).not.toBeNull()
      expect(loaded!.trajectory).toHaveLength(0)
      expect(loaded!.time).toBe(5.0)
    })
  })

  describe('only-if-better replacement', () => {
    it('should overwrite when new time is strictly better', () => {
      const traj1 = makeTrajectory(3)
      const traj2 = makeTrajectory(5)
      ghostStorage.saveGhost(1, traj1, 20.0)
      const saved = ghostStorage.saveGhost(1, traj2, 15.0)
      expect(saved).toBe(true)

      const loaded = ghostStorage.loadGhost(1)
      expect(loaded!.time).toBe(15.0)
      expect(loaded!.trajectory).toHaveLength(5)
    })

    it('should NOT overwrite when new time is equal', () => {
      const traj1 = makeTrajectory(3)
      const traj2 = makeTrajectory(5)
      ghostStorage.saveGhost(1, traj1, 20.0)
      const saved = ghostStorage.saveGhost(1, traj2, 20.0)
      expect(saved).toBe(false)

      const loaded = ghostStorage.loadGhost(1)
      expect(loaded!.trajectory).toHaveLength(3)
    })

    it('should NOT overwrite when new time is worse', () => {
      const traj1 = makeTrajectory(3)
      const traj2 = makeTrajectory(5)
      ghostStorage.saveGhost(1, traj1, 10.0)
      const saved = ghostStorage.saveGhost(1, traj2, 15.0)
      expect(saved).toBe(false)

      const loaded = ghostStorage.loadGhost(1)
      expect(loaded!.time).toBe(10.0)
    })
  })

  describe('hasGhost', () => {
    it('should return false when no ghost exists', () => {
      expect(ghostStorage.hasGhost(1)).toBe(false)
    })

    it('should return true after saving a ghost', () => {
      ghostStorage.saveGhost(1, makeTrajectory(2), 10.0)
      expect(ghostStorage.hasGhost(1)).toBe(true)
    })

    it('should return false for a different level', () => {
      ghostStorage.saveGhost(1, makeTrajectory(2), 10.0)
      expect(ghostStorage.hasGhost(2)).toBe(false)
    })
  })

  describe('removeGhost', () => {
    it('should remove a specific ghost', () => {
      ghostStorage.saveGhost(1, makeTrajectory(2), 10.0)
      ghostStorage.saveGhost(2, makeTrajectory(3), 12.0)
      ghostStorage.removeGhost(1)
      expect(ghostStorage.hasGhost(1)).toBe(false)
      expect(ghostStorage.hasGhost(2)).toBe(true)
    })
  })

  describe('clearAll', () => {
    it('should remove all ghost data', () => {
      ghostStorage.saveGhost(1, makeTrajectory(2), 10.0)
      ghostStorage.saveGhost(2, makeTrajectory(3), 12.0)
      ghostStorage.clearAll()
      expect(ghostStorage.hasGhost(1)).toBe(false)
      expect(ghostStorage.hasGhost(2)).toBe(false)
    })
  })

  describe('multiple levels', () => {
    it('should store ghosts for different levels independently', () => {
      ghostStorage.saveGhost(1, makeTrajectory(3), 10.0)
      ghostStorage.saveGhost(2, makeTrajectory(5), 20.0)
      ghostStorage.saveGhost(3, makeTrajectory(7), 30.0)

      const g1 = ghostStorage.loadGhost(1)
      const g2 = ghostStorage.loadGhost(2)
      const g3 = ghostStorage.loadGhost(3)

      expect(g1!.trajectory).toHaveLength(3)
      expect(g2!.trajectory).toHaveLength(5)
      expect(g3!.trajectory).toHaveLength(7)
      expect(g1!.time).toBe(10.0)
      expect(g2!.time).toBe(20.0)
      expect(g3!.time).toBe(30.0)
    })
  })

  describe('localStorage quota handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('marble-maze-3d-ghosts', 'not valid json')
      expect(ghostStorage.loadGhost(1)).toBeNull()
      expect(ghostStorage.hasGhost(1)).toBe(false)
    })

    it('should handle localStorage.setItem throwing', () => {
      // Save a ghost first
      ghostStorage.saveGhost(1, makeTrajectory(2), 10.0)

      // Now make setItem throw to simulate quota exceeded
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      // The eviction logic will try again; mock a second throw then success
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      // Try to save a new ghost — should try eviction and eventually fail gracefully
      const result = ghostStorage.saveGhost(2, makeTrajectory(3), 15.0)
      // Should not throw
      expect(typeof result).toBe('boolean')
    })

    it('should handle localStorage.getItem returning null', () => {
      const loaded = ghostStorage.loadGhost(1)
      expect(loaded).toBeNull()
    })
  })

  describe('compressed storage format', () => {
    it('should store data as flat arrays to minimize JSON size', () => {
      ghostStorage.saveGhost(1, makeTrajectory(3), 10.0)
      const raw = localStorageMock.getItem('marble-maze-3d-ghosts')
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed['1']).toBeDefined()
      expect(parsed['1'].data).toBeInstanceOf(Array)
      // 3 frames * 5 fields = 15 numbers in flat array
      expect(parsed['1'].data).toHaveLength(15)
    })

    it('should round time to 2 decimal places', () => {
      ghostStorage.saveGhost(1, makeTrajectory(1), 12.3456)
      const loaded = ghostStorage.loadGhost(1)
      expect(loaded!.time).toBe(12.35)
    })
  })
})
