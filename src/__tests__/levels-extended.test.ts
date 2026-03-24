import { describe, it, expect } from 'vitest'
import { ALL_LEVELS, getLevel, TOTAL_LEVEL_COUNT } from '../data/levels'

describe('level data — extended validation', () => {
  it('should have trap positions within board bounds', () => {
    ALL_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      level.traps.forEach((trap, i) => {
        expect(
          Math.abs(trap[0]),
          `Level ${level.id} trap ${i} X position (${trap[0]}) out of bounds (board half-width: ${halfW})`,
        ).toBeLessThanOrEqual(halfW)
        expect(
          Math.abs(trap[1]),
          `Level ${level.id} trap ${i} Z position (${trap[1]}) out of bounds (board half-depth: ${halfD})`,
        ).toBeLessThanOrEqual(halfD)
      })
    })
  })

  it('should not have any zero-length wall segments', () => {
    ALL_LEVELS.forEach(level => {
      level.walls.forEach((wall, i) => {
        const [x1, z1, x2, z2] = wall
        const samePoint = x1 === x2 && z1 === z2
        expect(
          samePoint,
          `Level ${level.id} wall ${i} is zero-length: [${wall}]`,
        ).toBe(false)
      })
    })
  })

  it('should have start and goal positions that are not on any trap', () => {
    ALL_LEVELS.forEach(level => {
      const TRAP_RADIUS = 0.3
      level.traps.forEach(trap => {
        const distToStart = Math.sqrt(
          (trap[0] - level.startPosition[0]) ** 2 +
          (trap[1] - level.startPosition[1]) ** 2,
        )
        expect(
          distToStart,
          `Level ${level.id}: start position too close to trap at [${trap}]`,
        ).toBeGreaterThan(TRAP_RADIUS)

        const distToGoal = Math.sqrt(
          (trap[0] - level.goalPosition[0]) ** 2 +
          (trap[1] - level.goalPosition[1]) ** 2,
        )
        expect(
          distToGoal,
          `Level ${level.id}: goal position too close to trap at [${trap}]`,
        ).toBeGreaterThan(TRAP_RADIUS)
      })
    })
  })

  it('should have gems that are not placed on traps', () => {
    ALL_LEVELS.forEach(level => {
      const SAFE_DISTANCE = 0.3 // TRAP_RADIUS
      level.gems.forEach((gem, gi) => {
        level.traps.forEach((trap, ti) => {
          const dist = Math.sqrt(
            (gem[0] - trap[0]) ** 2 +
            (gem[1] - trap[1]) ** 2,
          )
          expect(
            dist,
            `Level ${level.id}: gem ${gi} at [${gem}] overlaps trap ${ti} at [${trap}]`,
          ).toBeGreaterThan(SAFE_DISTANCE)
        })
      })
    })
  })

  it('should have unique names across all levels', () => {
    const names = ALL_LEVELS.map(l => l.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('should have boardSize large enough to contain start and goal', () => {
    ALL_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      // Start must be well within bounds (at least marble radius margin)
      const MARGIN = 0.2 // MARBLE_RADIUS
      expect(
        Math.abs(level.startPosition[0]) + MARGIN,
        `Level ${level.id}: start X too close to edge`,
      ).toBeLessThanOrEqual(halfW)
      expect(
        Math.abs(level.startPosition[1]) + MARGIN,
        `Level ${level.id}: start Z too close to edge`,
      ).toBeLessThanOrEqual(halfD)
      expect(
        Math.abs(level.goalPosition[0]) + MARGIN,
        `Level ${level.id}: goal X too close to edge`,
      ).toBeLessThanOrEqual(halfW)
      expect(
        Math.abs(level.goalPosition[1]) + MARGIN,
        `Level ${level.id}: goal Z too close to edge`,
      ).toBeLessThanOrEqual(halfD)
    })
  })

  it('should have all star thresholds as positive numbers', () => {
    ALL_LEVELS.forEach(level => {
      level.starThresholds.forEach((threshold) => {
        expect(threshold).toBeGreaterThan(0)
        expect(Number.isFinite(threshold)).toBe(true)
      })
    })
  })

  it('should have wall heights and thicknesses as positive numbers when specified', () => {
    ALL_LEVELS.forEach(level => {
      if (level.wallHeight !== undefined) {
        expect(level.wallHeight).toBeGreaterThan(0)
      }
      if (level.wallThickness !== undefined) {
        expect(level.wallThickness).toBeGreaterThan(0)
      }
    })
  })

  it('should have board sizes as even dimensions (for centered coordinate system)', () => {
    ALL_LEVELS.forEach(level => {
      expect(
        level.boardSize[0] % 2,
        `Level ${level.id} boardSize[0]=${level.boardSize[0]} is odd`,
      ).toBe(0)
      expect(
        level.boardSize[1] % 2,
        `Level ${level.id} boardSize[1]=${level.boardSize[1]} is odd`,
      ).toBe(0)
    })
  })
})

describe('getLevel — extended edge cases', () => {
  it('should return undefined for negative level ID', () => {
    expect(getLevel(-1)).toBeUndefined()
  })

  it('should return undefined for fractional level ID', () => {
    expect(getLevel(1.5)).toBeUndefined()
  })

  it('should return undefined for NaN', () => {
    expect(getLevel(NaN)).toBeUndefined()
  })

  it('should return correct level for each ID in order', () => {
    for (let i = 1; i <= TOTAL_LEVEL_COUNT; i++) {
      const level = getLevel(i)
      expect(level).toBeDefined()
      expect(level!.id).toBe(i)
    }
  })

  it('should return undefined for one past the last level', () => {
    expect(getLevel(TOTAL_LEVEL_COUNT + 1)).toBeUndefined()
  })

  it('TOTAL_LEVEL_COUNT should match the actual array length', () => {
    expect(TOTAL_LEVEL_COUNT).toBe(ALL_LEVELS.length)
  })
})
