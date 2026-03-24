import { describe, it, expect } from 'vitest'
import { WORLD_1_LEVELS, getLevel, WORLD_1_LEVEL_COUNT } from '../data/levels'
import type { Level } from '../data/levels'

describe('level data validation', () => {
  it('should have exactly 5 levels', () => {
    expect(WORLD_1_LEVELS).toHaveLength(5)
    expect(WORLD_1_LEVEL_COUNT).toBe(5)
  })

  it('should have sequential IDs starting at 1', () => {
    WORLD_1_LEVELS.forEach((level, i) => {
      expect(level.id).toBe(i + 1)
    })
  })

  it('should all have names', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.name).toBeTruthy()
      expect(typeof level.name).toBe('string')
    })
  })

  it('should all have valid board sizes', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.boardSize).toHaveLength(2)
      expect(level.boardSize[0]).toBeGreaterThan(0)
      expect(level.boardSize[1]).toBeGreaterThan(0)
    })
  })

  it('should all have exactly 3 gems', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.gems).toHaveLength(3)
      level.gems.forEach(gem => {
        expect(gem).toHaveLength(2)
        expect(typeof gem[0]).toBe('number')
        expect(typeof gem[1]).toBe('number')
      })
    })
  })

  it('should all have at least 1 trap', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.traps.length).toBeGreaterThanOrEqual(1)
      level.traps.forEach(trap => {
        expect(trap).toHaveLength(2)
        expect(typeof trap[0]).toBe('number')
        expect(typeof trap[1]).toBe('number')
      })
    })
  })

  it('should all have walls (at least outer walls)', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.walls.length).toBeGreaterThanOrEqual(4) // at least 4 outer walls
      level.walls.forEach(wall => {
        expect(wall).toHaveLength(4)
        wall.forEach(coord => {
          expect(typeof coord).toBe('number')
        })
      })
    })
  })

  it('should all have valid star thresholds (descending)', () => {
    WORLD_1_LEVELS.forEach(level => {
      expect(level.starThresholds).toHaveLength(3)
      const [three, two, one] = level.starThresholds
      expect(three).toBeLessThan(two)
      expect(two).toBeLessThan(one)
      expect(three).toBeGreaterThan(0)
    })
  })

  it('should have start position within board bounds', () => {
    WORLD_1_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      expect(Math.abs(level.startPosition[0])).toBeLessThanOrEqual(halfW)
      expect(Math.abs(level.startPosition[1])).toBeLessThanOrEqual(halfD)
    })
  })

  it('should have goal position within board bounds', () => {
    WORLD_1_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      expect(Math.abs(level.goalPosition[0])).toBeLessThanOrEqual(halfW)
      expect(Math.abs(level.goalPosition[1])).toBeLessThanOrEqual(halfD)
    })
  })

  it('should have gem positions within board bounds', () => {
    WORLD_1_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      level.gems.forEach(gem => {
        expect(Math.abs(gem[0])).toBeLessThanOrEqual(halfW)
        expect(Math.abs(gem[1])).toBeLessThanOrEqual(halfD)
      })
    })
  })

  it('start and goal should not be at the same position', () => {
    WORLD_1_LEVELS.forEach(level => {
      const samePosition =
        level.startPosition[0] === level.goalPosition[0] &&
        level.startPosition[1] === level.goalPosition[1]
      expect(samePosition).toBe(false)
    })
  })

  it('should have increasing difficulty (star thresholds get more generous)', () => {
    for (let i = 1; i < WORLD_1_LEVELS.length; i++) {
      const prev = WORLD_1_LEVELS[i - 1]
      const curr = WORLD_1_LEVELS[i]
      // Later levels should generally have higher (more lenient) thresholds
      expect(curr.starThresholds[2]).toBeGreaterThanOrEqual(prev.starThresholds[2])
    }
  })
})

describe('getLevel', () => {
  it('should return the correct level by ID', () => {
    const level = getLevel(1)
    expect(level).toBeDefined()
    expect((level as Level).id).toBe(1)
    expect((level as Level).name).toBe('First Steps')
  })

  it('should return undefined for non-existent level', () => {
    expect(getLevel(99)).toBeUndefined()
    expect(getLevel(0)).toBeUndefined()
  })

  it('should return all levels by their IDs', () => {
    for (let i = 1; i <= WORLD_1_LEVEL_COUNT; i++) {
      const level = getLevel(i)
      expect(level).toBeDefined()
      expect((level as Level).id).toBe(i)
    }
  })
})
