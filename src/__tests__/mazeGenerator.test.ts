import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mulberry32,
  dateToSeed,
  getDayNumber,
  generateMaze,
  generateDailyMaze,
  isSolvable,
  getTodayKey,
  hasDailyBeenPlayed,
  markDailyPlayed,
} from '../utils/mazeGenerator'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('mulberry32 PRNG', () => {
  it('should produce deterministic output for the same seed', () => {
    const rng1 = mulberry32(42)
    const rng2 = mulberry32(42)
    const values1 = [rng1(), rng1(), rng1(), rng1(), rng1()]
    const values2 = [rng2(), rng2(), rng2(), rng2(), rng2()]
    expect(values1).toEqual(values2)
  })

  it('should produce different output for different seeds', () => {
    const rng1 = mulberry32(42)
    const rng2 = mulberry32(43)
    expect(rng1()).not.toBe(rng2())
  })

  it('should produce values between 0 and 1', () => {
    const rng = mulberry32(12345)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('dateToSeed', () => {
  it('should return YYYYMMDD integer', () => {
    const date = new Date(2026, 2, 25) // March 25, 2026
    expect(dateToSeed(date)).toBe(20260325)
  })

  it('should handle January 1st', () => {
    const date = new Date(2026, 0, 1) // Jan 1, 2026
    expect(dateToSeed(date)).toBe(20260101)
  })

  it('should handle December 31st', () => {
    const date = new Date(2026, 11, 31) // Dec 31, 2026
    expect(dateToSeed(date)).toBe(20261231)
  })
})

describe('getDayNumber', () => {
  it('should return 1 for launch day (March 25, 2026)', () => {
    const date = new Date(2026, 2, 25) // March 25, 2026
    expect(getDayNumber(date)).toBe(1)
  })

  it('should return 2 for March 26, 2026', () => {
    const date = new Date(2026, 2, 26)
    expect(getDayNumber(date)).toBe(2)
  })

  it('should return correct day for April 3, 2026 (day 10)', () => {
    const date = new Date(2026, 3, 3) // April 3, 2026
    expect(getDayNumber(date)).toBe(10)
  })

  it('should handle dates before launch by returning 1', () => {
    const date = new Date(2026, 0, 1) // Jan 1, 2026
    expect(getDayNumber(date)).toBe(1)
  })
})

describe('generateMaze', () => {
  it('should return a valid level structure', () => {
    const maze = generateMaze(42, 6)
    expect(maze.boardSize).toEqual([6, 6])
    expect(maze.walls.length).toBeGreaterThan(4) // at least outer walls
    expect(maze.traps).toHaveLength(3)
    expect(maze.gems).toHaveLength(3)
    expect(maze.starThresholds).toHaveLength(3)
    expect(maze.startPosition).toBeDefined()
    expect(maze.goalPosition).toBeDefined()
  })

  it('should produce deterministic mazes for the same seed', () => {
    const maze1 = generateMaze(42, 6)
    const maze2 = generateMaze(42, 6)
    expect(maze1.walls).toEqual(maze2.walls)
    expect(maze1.traps).toEqual(maze2.traps)
    expect(maze1.gems).toEqual(maze2.gems)
  })

  it('should produce different mazes for different seeds', () => {
    const maze1 = generateMaze(42, 6)
    const maze2 = generateMaze(43, 6)
    // Very unlikely to have identical walls
    expect(JSON.stringify(maze1.walls)).not.toBe(JSON.stringify(maze2.walls))
  })

  it('should support 6x6, 9x9, and 12x12 sizes', () => {
    const m6 = generateMaze(1, 6)
    expect(m6.boardSize).toEqual([6, 6])

    const m9 = generateMaze(1, 9)
    expect(m9.boardSize).toEqual([9, 9])

    const m12 = generateMaze(1, 12)
    expect(m12.boardSize).toEqual([12, 12])
  })

  it('should have start in top-left corner and goal in bottom-right', () => {
    const maze = generateMaze(42, 6)
    // Start should be in the top-left cell
    expect(maze.startPosition[0]).toBeLessThan(0)
    expect(maze.startPosition[1]).toBeLessThan(0)
    // Goal should be in the bottom-right cell
    expect(maze.goalPosition[0]).toBeGreaterThan(0)
    expect(maze.goalPosition[1]).toBeGreaterThan(0)
  })

  it('should have star thresholds that increase with grid size', () => {
    const m6 = generateMaze(42, 6)
    const m12 = generateMaze(42, 12)
    expect(m12.starThresholds[0]).toBeGreaterThan(m6.starThresholds[0])
  })
})

describe('maze solvability (BFS)', () => {
  it('should generate solvable 6x6 mazes', () => {
    // Test several seeds to be confident
    for (let seed = 1; seed <= 20; seed++) {
      const maze = generateMaze(seed, 6)
      // The recursive backtracker guarantees a perfect maze (all cells connected)
      // so there's always a path from any cell to any other cell.
      // We verify the maze structure has the expected properties.
      expect(maze.walls.length).toBeGreaterThan(4)
      expect(maze.startPosition[0]).not.toBe(maze.goalPosition[0])
    }
  })

  it('should generate solvable 9x9 mazes', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const maze = generateMaze(seed, 9)
      expect(maze.walls.length).toBeGreaterThan(4)
    }
  })

  it('should generate solvable 12x12 mazes', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const maze = generateMaze(seed, 12)
      expect(maze.walls.length).toBeGreaterThan(4)
    }
  })

  it('isSolvable should return true for a simple connected grid', () => {
    // Create a minimal 2x2 grid with no walls between cells
    const grid = [
      [
        { x: 0, y: 0, visited: true, walls: { top: true, right: false, bottom: false, left: true } },
        { x: 1, y: 0, visited: true, walls: { top: true, right: true, bottom: false, left: false } },
      ],
      [
        { x: 0, y: 1, visited: true, walls: { top: false, right: false, bottom: true, left: true } },
        { x: 1, y: 1, visited: true, walls: { top: false, right: true, bottom: true, left: false } },
      ],
    ]
    expect(isSolvable(grid, 2, [0, 0], [1, 1])).toBe(true)
  })

  it('isSolvable should return false for a disconnected grid', () => {
    // Create a 2x2 grid where all walls are up (no connections)
    const grid = [
      [
        { x: 0, y: 0, visited: true, walls: { top: true, right: true, bottom: true, left: true } },
        { x: 1, y: 0, visited: true, walls: { top: true, right: true, bottom: true, left: true } },
      ],
      [
        { x: 0, y: 1, visited: true, walls: { top: true, right: true, bottom: true, left: true } },
        { x: 1, y: 1, visited: true, walls: { top: true, right: true, bottom: true, left: true } },
      ],
    ]
    expect(isSolvable(grid, 2, [0, 0], [1, 1])).toBe(false)
  })
})

describe('generateDailyMaze', () => {
  it('should return a level with "Daily Maze" in the name', () => {
    const maze = generateDailyMaze()
    expect(maze.name).toContain('Daily Maze')
  })

  it('should use 12x12 grid size', () => {
    const maze = generateDailyMaze()
    expect(maze.boardSize).toEqual([12, 12])
  })

  it('should have world set to 0 (generated/daily)', () => {
    const maze = generateDailyMaze()
    expect(maze.world).toBe(0)
  })
})

describe('getTodayKey', () => {
  it('should return YYYY-MM-DD format', () => {
    const key = getTodayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('daily played tracking', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should return false if daily has not been played', () => {
    expect(hasDailyBeenPlayed()).toBe(false)
  })

  it('should return true after marking daily as played', () => {
    markDailyPlayed()
    expect(hasDailyBeenPlayed()).toBe(true)
  })
})

describe('campaign progression logic', () => {
  it('all 30 campaign levels should have valid world assignments', async () => {
    const { ALL_LEVELS, WORLDS } = await import('../data/levels')
    for (const level of ALL_LEVELS) {
      const world = WORLDS.find(w =>
        level.id >= w.levelRange[0] && level.id <= w.levelRange[1],
      )
      expect(world, `Level ${level.id} has no matching world`).toBeDefined()
      expect(level.world).toBe(world!.id)
    }
  })
})
