import { describe, it, expect } from 'vitest'
import { ALL_LEVELS, WORLDS, getLevel, getWorldLevels, getWorld, TOTAL_LEVEL_COUNT } from '../data/levels'
import type { Level } from '../data/levels'

describe('level data validation', () => {
  it('should have exactly 30 levels total', () => {
    expect(ALL_LEVELS).toHaveLength(30)
    expect(TOTAL_LEVEL_COUNT).toBe(30)
  })

  it('should have sequential IDs starting at 1', () => {
    ALL_LEVELS.forEach((level, i) => {
      expect(level.id).toBe(i + 1)
    })
  })

  it('should all have names', () => {
    ALL_LEVELS.forEach(level => {
      expect(level.name).toBeTruthy()
      expect(typeof level.name).toBe('string')
    })
  })

  it('should all have valid board sizes', () => {
    ALL_LEVELS.forEach(level => {
      expect(level.boardSize).toHaveLength(2)
      expect(level.boardSize[0]).toBeGreaterThan(0)
      expect(level.boardSize[1]).toBeGreaterThan(0)
    })
  })

  it('should all have exactly 3 gems', () => {
    ALL_LEVELS.forEach(level => {
      expect(level.gems).toHaveLength(3)
      level.gems.forEach(gem => {
        expect(gem).toHaveLength(2)
        expect(typeof gem[0]).toBe('number')
        expect(typeof gem[1]).toBe('number')
      })
    })
  })

  it('should all have at least 1 trap', () => {
    ALL_LEVELS.forEach(level => {
      expect(level.traps.length).toBeGreaterThanOrEqual(1)
      level.traps.forEach(trap => {
        expect(trap).toHaveLength(2)
        expect(typeof trap[0]).toBe('number')
        expect(typeof trap[1]).toBe('number')
      })
    })
  })

  it('should all have walls (at least outer walls)', () => {
    ALL_LEVELS.forEach(level => {
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
    ALL_LEVELS.forEach(level => {
      expect(level.starThresholds).toHaveLength(3)
      const [three, two, one] = level.starThresholds
      expect(three).toBeLessThan(two)
      expect(two).toBeLessThan(one)
      expect(three).toBeGreaterThan(0)
    })
  })

  it('should have start position within board bounds', () => {
    ALL_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      expect(Math.abs(level.startPosition[0])).toBeLessThanOrEqual(halfW)
      expect(Math.abs(level.startPosition[1])).toBeLessThanOrEqual(halfD)
    })
  })

  it('should have goal position within board bounds', () => {
    ALL_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      expect(Math.abs(level.goalPosition[0])).toBeLessThanOrEqual(halfW)
      expect(Math.abs(level.goalPosition[1])).toBeLessThanOrEqual(halfD)
    })
  })

  it('should have gem positions within board bounds', () => {
    ALL_LEVELS.forEach(level => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      level.gems.forEach(gem => {
        expect(Math.abs(gem[0])).toBeLessThanOrEqual(halfW)
        expect(Math.abs(gem[1])).toBeLessThanOrEqual(halfD)
      })
    })
  })

  it('start and goal should not be at the same position', () => {
    ALL_LEVELS.forEach(level => {
      const samePosition =
        level.startPosition[0] === level.goalPosition[0] &&
        level.startPosition[1] === level.goalPosition[1]
      expect(samePosition).toBe(false)
    })
  })

  it('should have correct world assignments', () => {
    ALL_LEVELS.forEach(level => {
      if (level.id <= 10) expect(level.world).toBe(1)
      else if (level.id <= 20) expect(level.world).toBe(2)
      else expect(level.world).toBe(3)
    })
  })
})

describe('world metadata', () => {
  it('should have exactly 3 worlds', () => {
    expect(WORLDS).toHaveLength(3)
  })

  it('should have correct level ranges', () => {
    expect(WORLDS[0].levelRange).toEqual([1, 10])
    expect(WORLDS[1].levelRange).toEqual([11, 20])
    expect(WORLDS[2].levelRange).toEqual([21, 30])
  })

  it('should have 10 levels per world', () => {
    WORLDS.forEach(world => {
      const levels = getWorldLevels(world.id)
      expect(levels).toHaveLength(10)
    })
  })

  it('should have world 1 unlocked by default (0 stars)', () => {
    expect(WORLDS[0].starsToUnlock).toBe(0)
  })

  it('should require increasing stars to unlock later worlds', () => {
    for (let i = 1; i < WORLDS.length; i++) {
      expect(WORLDS[i].starsToUnlock).toBeGreaterThan(WORLDS[i - 1].starsToUnlock)
    }
  })

  it('should have theme colors for each world', () => {
    WORLDS.forEach(world => {
      expect(world.colors).toHaveLength(3)
      world.colors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })
  })
})

describe('special mechanics by world', () => {
  it('World 1 levels should have no special mechanics', () => {
    const w1 = getWorldLevels(1)
    w1.forEach(level => {
      expect(level.movingWalls).toBeUndefined()
      expect(level.icePatches).toBeUndefined()
      expect(level.rotatingSegments).toBeUndefined()
      expect(level.windZones).toBeUndefined()
    })
  })

  it('World 2 levels should have moving walls or ice patches', () => {
    const w2 = getWorldLevels(2)
    const hasSpecial = w2.filter(
      l => (l.movingWalls && l.movingWalls.length > 0) || (l.icePatches && l.icePatches.length > 0),
    )
    expect(hasSpecial.length).toBeGreaterThanOrEqual(5) // most W2 levels should have at least one
  })

  it('World 3 levels should have rotating segments or wind zones', () => {
    const w3 = getWorldLevels(3)
    const hasSpecial = w3.filter(
      l => (l.rotatingSegments && l.rotatingSegments.length > 0) || (l.windZones && l.windZones.length > 0),
    )
    expect(hasSpecial.length).toBeGreaterThanOrEqual(5)
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

  it('should return all 30 levels by their IDs', () => {
    for (let i = 1; i <= TOTAL_LEVEL_COUNT; i++) {
      const level = getLevel(i)
      expect(level).toBeDefined()
      expect((level as Level).id).toBe(i)
    }
  })
})

describe('getWorld', () => {
  it('should return correct world by ID', () => {
    const w1 = getWorld(1)
    expect(w1).toBeDefined()
    expect(w1!.name).toBe('Wooden Workshop')

    const w2 = getWorld(2)
    expect(w2).toBeDefined()
    expect(w2!.name).toBe('Crystal Cavern')

    const w3 = getWorld(3)
    expect(w3).toBeDefined()
    expect(w3!.name).toBe('Sky Temple')
  })

  it('should return undefined for non-existent world', () => {
    expect(getWorld(0)).toBeUndefined()
    expect(getWorld(4)).toBeUndefined()
  })
})
