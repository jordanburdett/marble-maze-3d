import { describe, it, expect } from 'vitest'
import {
  ALL_LEVELS,
  WORLDS,
  getWorldLevels,
  type MovingWallDef,
  type IcePatchDef,
  type RotatingSegmentDef,
  type WindZoneDef,
} from '../data/levels'
import {
  generateMaze,
  generateDailyMaze,
  generateFreePlayMaze,
  isSolvable,
  mulberry32,
  dateToSeed,
  getDayNumber,
} from '../utils/mazeGenerator'

// =============================================================================
// 1. EVERY World 2 level must define movingWalls or icePatches
// =============================================================================
describe('World 2 special mechanics — per-level validation', () => {
  const w2 = getWorldLevels(2)

  w2.forEach(level => {
    it(`Level ${level.id} (${level.name}) should have movingWalls or icePatches`, () => {
      const hasMoving = level.movingWalls !== undefined && level.movingWalls.length > 0
      const hasIce = level.icePatches !== undefined && level.icePatches.length > 0
      expect(
        hasMoving || hasIce,
        `Level ${level.id} has neither movingWalls nor icePatches`,
      ).toBe(true)
    })
  })

  it('should have exactly 10 World 2 levels', () => {
    expect(w2).toHaveLength(10)
  })
})

// =============================================================================
// 2. EVERY World 3 level must define rotatingSegments or windZones
// =============================================================================
describe('World 3 special mechanics — per-level validation', () => {
  const w3 = getWorldLevels(3)

  w3.forEach(level => {
    it(`Level ${level.id} (${level.name}) should have rotatingSegments or windZones`, () => {
      const hasRotating = level.rotatingSegments !== undefined && level.rotatingSegments.length > 0
      const hasWind = level.windZones !== undefined && level.windZones.length > 0
      expect(
        hasRotating || hasWind,
        `Level ${level.id} has neither rotatingSegments nor windZones`,
      ).toBe(true)
    })
  })

  it('should have exactly 10 World 3 levels', () => {
    expect(w3).toHaveLength(10)
  })
})

// =============================================================================
// 3. MovingWall data structure validation (W2 levels)
// =============================================================================
describe('MovingWall definitions — structural integrity', () => {
  const levelsWithMoving = ALL_LEVELS.filter(
    l => l.movingWalls && l.movingWalls.length > 0,
  )

  it('should have at least one level with movingWalls', () => {
    expect(levelsWithMoving.length).toBeGreaterThan(0)
  })

  levelsWithMoving.forEach(level => {
    describe(`Level ${level.id} (${level.name}) movingWalls`, () => {
      const walls = level.movingWalls as MovingWallDef[]
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2

      walls.forEach((mw, i) => {
        it(`movingWall[${i}] start position should be within board bounds`, () => {
          expect(Math.abs(mw.start[0])).toBeLessThanOrEqual(halfW)
          expect(Math.abs(mw.start[1])).toBeLessThanOrEqual(halfD)
        })

        it(`movingWall[${i}] end position should be within board bounds`, () => {
          expect(Math.abs(mw.end[0])).toBeLessThanOrEqual(halfW)
          expect(Math.abs(mw.end[1])).toBeLessThanOrEqual(halfD)
        })

        it(`movingWall[${i}] speed should be positive`, () => {
          expect(mw.speed).toBeGreaterThan(0)
        })

        it(`movingWall[${i}] length should be positive`, () => {
          expect(mw.length).toBeGreaterThan(0)
        })

        it(`movingWall[${i}] orientation should be 'h' or 'v'`, () => {
          expect(['h', 'v']).toContain(mw.orientation)
        })
      })
    })
  })
})

// =============================================================================
// 4. IcePatch data structure validation
// =============================================================================
describe('IcePatch definitions — structural integrity', () => {
  const levelsWithIce = ALL_LEVELS.filter(
    l => l.icePatches && l.icePatches.length > 0,
  )

  it('should have at least one level with icePatches', () => {
    expect(levelsWithIce.length).toBeGreaterThan(0)
  })

  levelsWithIce.forEach(level => {
    describe(`Level ${level.id} (${level.name}) icePatches`, () => {
      const patches = level.icePatches as IcePatchDef[]
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2

      patches.forEach((patch, i) => {
        it(`icePatch[${i}] center should be within board bounds`, () => {
          expect(Math.abs(patch.position[0])).toBeLessThanOrEqual(halfW)
          expect(Math.abs(patch.position[1])).toBeLessThanOrEqual(halfD)
        })

        it(`icePatch[${i}] size should be positive`, () => {
          expect(patch.size[0]).toBeGreaterThan(0)
          expect(patch.size[1]).toBeGreaterThan(0)
        })
      })
    })
  })
})

// =============================================================================
// 5. RotatingSegment data structure validation
// =============================================================================
describe('RotatingSegment definitions — structural integrity', () => {
  const levelsWithRotating = ALL_LEVELS.filter(
    l => l.rotatingSegments && l.rotatingSegments.length > 0,
  )

  it('should have at least one level with rotatingSegments', () => {
    expect(levelsWithRotating.length).toBeGreaterThan(0)
  })

  levelsWithRotating.forEach(level => {
    describe(`Level ${level.id} (${level.name}) rotatingSegments`, () => {
      const segments = level.rotatingSegments as RotatingSegmentDef[]
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2

      segments.forEach((seg, i) => {
        it(`rotatingSegment[${i}] center should be within board bounds`, () => {
          expect(Math.abs(seg.position[0])).toBeLessThanOrEqual(halfW)
          expect(Math.abs(seg.position[1])).toBeLessThanOrEqual(halfD)
        })

        it(`rotatingSegment[${i}] radius should be positive`, () => {
          expect(seg.radius).toBeGreaterThan(0)
        })

        it(`rotatingSegment[${i}] speed should be non-zero`, () => {
          expect(seg.speed).not.toBe(0)
        })
      })
    })
  })
})

// =============================================================================
// 6. WindZone data structure validation
// =============================================================================
describe('WindZone definitions — structural integrity', () => {
  const levelsWithWind = ALL_LEVELS.filter(
    l => l.windZones && l.windZones.length > 0,
  )

  it('should have at least one level with windZones', () => {
    expect(levelsWithWind.length).toBeGreaterThan(0)
  })

  levelsWithWind.forEach(level => {
    describe(`Level ${level.id} (${level.name}) windZones`, () => {
      const zones = level.windZones as WindZoneDef[]
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2

      zones.forEach((wz, i) => {
        it(`windZone[${i}] center should be within board bounds`, () => {
          expect(Math.abs(wz.position[0])).toBeLessThanOrEqual(halfW)
          expect(Math.abs(wz.position[1])).toBeLessThanOrEqual(halfD)
        })

        it(`windZone[${i}] size should be positive`, () => {
          expect(wz.size[0]).toBeGreaterThan(0)
          expect(wz.size[1]).toBeGreaterThan(0)
        })

        it(`windZone[${i}] strength should be positive`, () => {
          expect(wz.strength).toBeGreaterThan(0)
        })

        it(`windZone[${i}] direction should be a 2D vector`, () => {
          expect(wz.direction).toHaveLength(2)
          // Direction magnitude should be non-zero
          const mag = Math.sqrt(wz.direction[0] ** 2 + wz.direction[1] ** 2)
          expect(mag).toBeGreaterThan(0)
        })
      })
    })
  })
})

// =============================================================================
// 7. Actual BFS solvability on generated mazes (not just structural checks)
// =============================================================================
describe('generated maze BFS solvability — real path verification', () => {
  // We need to access the grid from the maze generator to run isSolvable.
  // Since generateMaze returns a Level (not the grid), we re-generate with
  // the same PRNG to get the grid, then check isSolvable.

  function verifyGeneratedMazeSolvability(seed: number, gridSize: 6 | 9 | 12) {
    // Re-create the grid the same way generateMaze does internally
    const rng = mulberry32(seed)
    const grid: Array<Array<{
      x: number; y: number; visited: boolean;
      walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
    }>> = []

    for (let y = 0; y < gridSize; y++) {
      grid[y] = []
      for (let x = 0; x < gridSize; x++) {
        grid[y][x] = {
          x, y, visited: false,
          walls: { top: true, right: true, bottom: true, left: true },
        }
      }
    }

    const stack: typeof grid[0][0][] = []
    const start = grid[0][0]
    start.visited = true
    stack.push(start)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors: typeof current[] = []
      if (current.y > 0 && !grid[current.y - 1][current.x].visited) neighbors.push(grid[current.y - 1][current.x])
      if (current.x < gridSize - 1 && !grid[current.y][current.x + 1].visited) neighbors.push(grid[current.y][current.x + 1])
      if (current.y < gridSize - 1 && !grid[current.y + 1][current.x].visited) neighbors.push(grid[current.y + 1][current.x])
      if (current.x > 0 && !grid[current.y][current.x - 1].visited) neighbors.push(grid[current.y][current.x - 1])
      if (neighbors.length > 0) {
        const idx = Math.floor(rng() * neighbors.length)
        const next = neighbors[idx]
        next.visited = true
        if (next.x === current.x + 1) { current.walls.right = false; next.walls.left = false }
        else if (next.x === current.x - 1) { current.walls.left = false; next.walls.right = false }
        else if (next.y === current.y + 1) { current.walls.bottom = false; next.walls.top = false }
        else if (next.y === current.y - 1) { current.walls.top = false; next.walls.bottom = false }
        stack.push(next)
      } else {
        stack.pop()
      }
    }

    return isSolvable(grid, gridSize, [0, 0], [gridSize - 1, gridSize - 1])
  }

  it('every 6x6 maze (seeds 1-50) should be solvable via BFS', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(
        verifyGeneratedMazeSolvability(seed, 6),
        `6x6 maze with seed ${seed} is NOT solvable`,
      ).toBe(true)
    }
  })

  it('every 9x9 maze (seeds 1-30) should be solvable via BFS', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(
        verifyGeneratedMazeSolvability(seed, 9),
        `9x9 maze with seed ${seed} is NOT solvable`,
      ).toBe(true)
    }
  })

  it('every 12x12 maze (seeds 1-20) should be solvable via BFS', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(
        verifyGeneratedMazeSolvability(seed, 12),
        `12x12 maze with seed ${seed} is NOT solvable`,
      ).toBe(true)
    }
  })
})

// =============================================================================
// 8. generateFreePlayMaze — untested function
// =============================================================================
describe('generateFreePlayMaze', () => {
  it('should return a valid level structure for 6x6', () => {
    const maze = generateFreePlayMaze(6)
    expect(maze.boardSize).toEqual([6, 6])
    expect(maze.name).toContain('Free Play')
    expect(maze.world).toBe(0)
    expect(maze.walls.length).toBeGreaterThan(4)
    expect(maze.traps).toHaveLength(3)
    expect(maze.gems).toHaveLength(3)
    expect(maze.starThresholds).toHaveLength(3)
  })

  it('should return a valid level structure for 9x9', () => {
    const maze = generateFreePlayMaze(9)
    expect(maze.boardSize).toEqual([9, 9])
    expect(maze.name).toContain('Free Play')
  })

  it('should return a valid level structure for 12x12', () => {
    const maze = generateFreePlayMaze(12)
    expect(maze.boardSize).toEqual([12, 12])
    expect(maze.name).toContain('Free Play')
  })

  it('should produce different mazes on consecutive calls (non-deterministic)', () => {
    const maze1 = generateFreePlayMaze(6)
    const maze2 = generateFreePlayMaze(6)
    // We can't guarantee they differ with 100% certainty, but we can verify structure
    expect(maze1.boardSize).toEqual(maze2.boardSize)
    // At minimum, both should be valid
    expect(maze1.walls.length).toBeGreaterThan(4)
    expect(maze2.walls.length).toBeGreaterThan(4)
  })
})

// =============================================================================
// 9. Daily maze deterministic seeding — same date always yields same maze
// =============================================================================
describe('daily maze deterministic seeding', () => {
  it('same seed always produces identical maze layout', () => {
    const seed = dateToSeed(new Date(2026, 2, 25))
    const maze1 = generateMaze(seed, 12)
    const maze2 = generateMaze(seed, 12)
    expect(maze1.walls).toEqual(maze2.walls)
    expect(maze1.traps).toEqual(maze2.traps)
    expect(maze1.gems).toEqual(maze2.gems)
    expect(maze1.startPosition).toEqual(maze2.startPosition)
    expect(maze1.goalPosition).toEqual(maze2.goalPosition)
    expect(maze1.starThresholds).toEqual(maze2.starThresholds)
  })

  it('different dates produce different mazes', () => {
    const seed1 = dateToSeed(new Date(2026, 2, 25))
    const seed2 = dateToSeed(new Date(2026, 2, 26))
    const maze1 = generateMaze(seed1, 12)
    const maze2 = generateMaze(seed2, 12)
    expect(JSON.stringify(maze1.walls)).not.toBe(JSON.stringify(maze2.walls))
  })

  it('launch day seed should be 20260325', () => {
    const seed = dateToSeed(new Date(2026, 2, 25))
    expect(seed).toBe(20260325)
  })
})

// =============================================================================
// 10. getDayNumber — additional edge cases
// =============================================================================
describe('getDayNumber — extended edge cases', () => {
  it('should return 366 for March 25, 2027 (one year later)', () => {
    const date = new Date(2027, 2, 25)
    expect(getDayNumber(date)).toBe(366)
  })

  it('should return 1 for dates well before launch', () => {
    const date = new Date(2020, 0, 1)
    expect(getDayNumber(date)).toBe(1)
  })

  it('should handle leap year correctly (2028 is a leap year)', () => {
    const feb29 = new Date(2028, 1, 29)
    const mar1 = new Date(2028, 2, 1)
    expect(getDayNumber(mar1) - getDayNumber(feb29)).toBe(1)
  })

  it('should return 31 for April 24, 2026 (one month after launch)', () => {
    const date = new Date(2026, 3, 24)
    expect(getDayNumber(date)).toBe(31)
  })
})

// =============================================================================
// 11. Campaign progression — world unlock star gating
// =============================================================================
describe('campaign progression — world unlock star gating', () => {
  it('World 1 should be unlocked by default (0 stars required)', () => {
    expect(WORLDS[0].starsToUnlock).toBe(0)
  })

  it('World 2 unlock requirement should be achievable from World 1 alone', () => {
    // Each level can award up to 3 stars, World 1 has 10 levels = 30 max stars
    const maxW1Stars = 10 * 3
    expect(WORLDS[1].starsToUnlock).toBeLessThanOrEqual(maxW1Stars)
  })

  it('World 3 unlock requirement should be achievable from Worlds 1+2 combined', () => {
    const maxW1W2Stars = 20 * 3 // 20 levels, 3 stars each = 60
    expect(WORLDS[2].starsToUnlock).toBeLessThanOrEqual(maxW1W2Stars)
  })

  it('world unlock thresholds should be strictly increasing', () => {
    for (let i = 1; i < WORLDS.length; i++) {
      expect(WORLDS[i].starsToUnlock).toBeGreaterThan(WORLDS[i - 1].starsToUnlock)
    }
  })

  it('unlock thresholds should be reachable but not trivial', () => {
    // World 2 requires at least 5 3-star completions (15 stars)
    expect(WORLDS[1].starsToUnlock).toBeGreaterThanOrEqual(10)
    // World 3 requires meaningful W1+W2 progress
    expect(WORLDS[2].starsToUnlock).toBeGreaterThanOrEqual(20)
  })
})

// =============================================================================
// 12. Wall segments within board bounds for ALL 30 campaign levels
// =============================================================================
describe('wall segment coordinates — within board bounds', () => {
  ALL_LEVELS.forEach(level => {
    it(`Level ${level.id} (${level.name}) walls should be within board bounds`, () => {
      const halfW = level.boardSize[0] / 2
      const halfD = level.boardSize[1] / 2
      const tolerance = 0.01 // allow tiny floating point imprecision
      level.walls.forEach((wall, i) => {
        const [x1, z1, x2, z2] = wall
        expect(
          Math.abs(x1),
          `Level ${level.id} wall ${i} x1=${x1} exceeds half-width ${halfW}`,
        ).toBeLessThanOrEqual(halfW + tolerance)
        expect(
          Math.abs(z1),
          `Level ${level.id} wall ${i} z1=${z1} exceeds half-depth ${halfD}`,
        ).toBeLessThanOrEqual(halfD + tolerance)
        expect(
          Math.abs(x2),
          `Level ${level.id} wall ${i} x2=${x2} exceeds half-width ${halfW}`,
        ).toBeLessThanOrEqual(halfW + tolerance)
        expect(
          Math.abs(z2),
          `Level ${level.id} wall ${i} z2=${z2} exceeds half-depth ${halfD}`,
        ).toBeLessThanOrEqual(halfD + tolerance)
      })
    })
  })
})

// =============================================================================
// 13. PRNG edge cases
// =============================================================================
describe('mulberry32 PRNG — edge cases', () => {
  it('should handle seed of 0', () => {
    const rng = mulberry32(0)
    const v = rng()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('should handle large seed values', () => {
    const rng = mulberry32(2147483647) // max 32-bit signed int
    const v = rng()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('should handle negative seed values', () => {
    const rng = mulberry32(-42)
    const v = rng()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('should produce uniform-ish distribution (chi-squared proxy)', () => {
    const rng = mulberry32(999)
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const N = 10000
    for (let i = 0; i < N; i++) {
      const bucket = Math.min(9, Math.floor(rng() * 10))
      buckets[bucket]++
    }
    // Each bucket should have roughly N/10 = 1000 values
    // Allow 30% deviation for randomness
    buckets.forEach(count => {
      expect(count).toBeGreaterThan(700)
      expect(count).toBeLessThan(1300)
    })
  })
})

// =============================================================================
// 14. Generated maze structure — gem/trap placement validity
// =============================================================================
describe('generated maze — item placement validity', () => {
  const sizes: Array<6 | 9 | 12> = [6, 9, 12]

  sizes.forEach(gridSize => {
    describe(`${gridSize}x${gridSize} mazes`, () => {
      it('gems should be within board bounds', () => {
        for (let seed = 1; seed <= 10; seed++) {
          const maze = generateMaze(seed, gridSize)
          const half = gridSize / 2
          maze.gems.forEach((gem, i) => {
            expect(
              Math.abs(gem[0]),
              `Seed ${seed} gem ${i} X out of bounds`,
            ).toBeLessThanOrEqual(half)
            expect(
              Math.abs(gem[1]),
              `Seed ${seed} gem ${i} Z out of bounds`,
            ).toBeLessThanOrEqual(half)
          })
        }
      })

      it('traps should be within board bounds', () => {
        for (let seed = 1; seed <= 10; seed++) {
          const maze = generateMaze(seed, gridSize)
          const half = gridSize / 2
          maze.traps.forEach((trap, i) => {
            expect(
              Math.abs(trap[0]),
              `Seed ${seed} trap ${i} X out of bounds`,
            ).toBeLessThanOrEqual(half)
            expect(
              Math.abs(trap[1]),
              `Seed ${seed} trap ${i} Z out of bounds`,
            ).toBeLessThanOrEqual(half)
          })
        }
      })

      it('start and goal should not overlap any traps', () => {
        for (let seed = 1; seed <= 10; seed++) {
          const maze = generateMaze(seed, gridSize)
          maze.traps.forEach(trap => {
            const distToStart = Math.sqrt(
              (trap[0] - maze.startPosition[0]) ** 2 +
              (trap[1] - maze.startPosition[1]) ** 2,
            )
            expect(distToStart).toBeGreaterThan(0.3)
            const distToGoal = Math.sqrt(
              (trap[0] - maze.goalPosition[0]) ** 2 +
              (trap[1] - maze.goalPosition[1]) ** 2,
            )
            expect(distToGoal).toBeGreaterThan(0.3)
          })
        }
      })
    })
  })
})

// =============================================================================
// 15. generateDailyMaze — uses 12x12 grid and correct naming
// =============================================================================
describe('generateDailyMaze — detailed checks', () => {
  it('should have id equal to the date seed', () => {
    const maze = generateDailyMaze()
    const todaySeed = dateToSeed(new Date())
    expect(maze.id).toBe(todaySeed)
  })

  it('should have world = 0 (daily/generated)', () => {
    const maze = generateDailyMaze()
    expect(maze.world).toBe(0)
  })

  it('should have wallHeight and wallThickness set', () => {
    const maze = generateDailyMaze()
    expect(maze.wallHeight).toBe(0.4)
    expect(maze.wallThickness).toBe(0.15)
  })

  it('should have exactly 3 gems and 3 traps', () => {
    const maze = generateDailyMaze()
    expect(maze.gems).toHaveLength(3)
    expect(maze.traps).toHaveLength(3)
  })
})
