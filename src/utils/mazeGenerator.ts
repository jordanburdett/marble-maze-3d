import type { WallSegment, GemPosition, TrapPosition, Level } from '../data/levels'

/** mulberry32 PRNG — deterministic 32-bit RNG seeded with an integer */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Get the YYYYMMDD integer for a given date */
export function dateToSeed(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return y * 10000 + m * 100 + d
}

/** Day number since launch (March 25, 2026) */
export function getDayNumber(date: Date): number {
  const launch = new Date(2026, 2, 25) // March 25, 2026 (month is 0-indexed)
  launch.setHours(0, 0, 0, 0)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - launch.getTime()
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1)
}

/** Get today's date string YYYY-MM-DD for localStorage key */
export function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Check if the daily maze has been played today */
export function hasDailyBeenPlayed(): boolean {
  try {
    const key = `marble-maze-daily-${getTodayKey()}`
    return localStorage.getItem(key) === 'played'
  } catch {
    return false
  }
}

/** Mark the daily maze as played today */
export function markDailyPlayed(): void {
  try {
    const key = `marble-maze-daily-${getTodayKey()}`
    localStorage.setItem(key, 'played')
  } catch {
    // Storage unavailable
  }
}

interface Cell {
  x: number
  y: number
  visited: boolean
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

/**
 * Recursive backtracker maze generation on a grid.
 * Returns a grid of cells with wall data.
 */
function generateMazeGrid(
  gridSize: number,
  rng: () => number,
): Cell[][] {
  const grid: Cell[][] = []
  for (let y = 0; y < gridSize; y++) {
    grid[y] = []
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = {
        x, y, visited: false,
        walls: { top: true, right: true, bottom: true, left: true },
      }
    }
  }

  const stack: Cell[] = []
  const start = grid[0][0]
  start.visited = true
  stack.push(start)

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors: Cell[] = []

    // Check all 4 neighbors
    if (current.y > 0 && !grid[current.y - 1][current.x].visited) {
      neighbors.push(grid[current.y - 1][current.x])
    }
    if (current.x < gridSize - 1 && !grid[current.y][current.x + 1].visited) {
      neighbors.push(grid[current.y][current.x + 1])
    }
    if (current.y < gridSize - 1 && !grid[current.y + 1][current.x].visited) {
      neighbors.push(grid[current.y + 1][current.x])
    }
    if (current.x > 0 && !grid[current.y][current.x - 1].visited) {
      neighbors.push(grid[current.y][current.x - 1])
    }

    if (neighbors.length > 0) {
      const idx = Math.floor(rng() * neighbors.length)
      const next = neighbors[idx]
      next.visited = true

      // Remove walls between current and next
      if (next.x === current.x + 1) {
        current.walls.right = false
        next.walls.left = false
      } else if (next.x === current.x - 1) {
        current.walls.left = false
        next.walls.right = false
      } else if (next.y === current.y + 1) {
        current.walls.bottom = false
        next.walls.top = false
      } else if (next.y === current.y - 1) {
        current.walls.top = false
        next.walls.bottom = false
      }

      stack.push(next)
    } else {
      stack.pop()
    }
  }

  return grid
}

/**
 * Convert a maze grid to wall segments suitable for the game engine.
 * Each cell in the grid maps to a physical area on the board.
 */
function gridToWallSegments(
  grid: Cell[][],
  gridSize: number,
  boardSize: number,
): WallSegment[] {
  const cellSize = boardSize / gridSize
  const half = boardSize / 2
  const walls: WallSegment[] = []

  // Outer walls
  walls.push([-half, -half, half, -half])  // top
  walls.push([-half, half, half, half])    // bottom
  walls.push([-half, -half, -half, half])  // left
  walls.push([half, -half, half, half])    // right

  // Internal walls
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = grid[y][x]
      const cx = -half + x * cellSize
      const cz = -half + y * cellSize

      // Right wall (avoid outer edge, already added)
      if (cell.walls.right && x < gridSize - 1) {
        walls.push([cx + cellSize, cz, cx + cellSize, cz + cellSize])
      }
      // Bottom wall (avoid outer edge, already added)
      if (cell.walls.bottom && y < gridSize - 1) {
        walls.push([cx, cz + cellSize, cx + cellSize, cz + cellSize])
      }
    }
  }

  return walls
}

/** Place N items on the grid avoiding certain positions */
function placeItems(
  count: number,
  gridSize: number,
  boardSize: number,
  rng: () => number,
  avoid: Array<[number, number]>,
  minDist: number,
): Array<[number, number]> {
  const cellSize = boardSize / gridSize
  const half = boardSize / 2
  const items: Array<[number, number]> = []

  let attempts = 0
  while (items.length < count && attempts < 200) {
    attempts++
    const gx = Math.floor(rng() * gridSize)
    const gy = Math.floor(rng() * gridSize)
    const x = -half + (gx + 0.5) * cellSize
    const z = -half + (gy + 0.5) * cellSize

    // Check distance from all avoided positions
    const tooClose = [...avoid, ...items].some(
      ([ax, az]) => Math.sqrt((x - ax) ** 2 + (z - az) ** 2) < minDist,
    )
    if (!tooClose) {
      items.push([x, z])
    }
  }

  // Fallback: if we couldn't place enough, just place remaining in available spots
  while (items.length < count) {
    const gx = Math.floor(rng() * gridSize)
    const gy = Math.floor(rng() * gridSize)
    const cellSize2 = boardSize / gridSize
    const x = -half + (gx + 0.5) * cellSize2
    const z = -half + (gy + 0.5) * cellSize2
    items.push([x, z])
  }

  return items
}

/**
 * BFS solvability check: does a path exist from start to goal?
 * Works on the maze grid cells.
 */
export function isSolvable(
  grid: Cell[][],
  gridSize: number,
  startCell: [number, number],
  goalCell: [number, number],
): boolean {
  const visited = new Set<string>()
  const queue: Array<[number, number]> = [startCell]
  visited.add(`${startCell[0]},${startCell[1]}`)

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!

    if (cx === goalCell[0] && cy === goalCell[1]) return true

    const cell = grid[cy][cx]

    // Check all 4 directions
    if (!cell.walls.top && cy > 0) {
      const key = `${cx},${cy - 1}`
      if (!visited.has(key)) { visited.add(key); queue.push([cx, cy - 1]) }
    }
    if (!cell.walls.right && cx < gridSize - 1) {
      const key = `${cx + 1},${cy}`
      if (!visited.has(key)) { visited.add(key); queue.push([cx + 1, cy]) }
    }
    if (!cell.walls.bottom && cy < gridSize - 1) {
      const key = `${cx},${cy + 1}`
      if (!visited.has(key)) { visited.add(key); queue.push([cx, cy + 1]) }
    }
    if (!cell.walls.left && cx > 0) {
      const key = `${cx - 1},${cy}`
      if (!visited.has(key)) { visited.add(key); queue.push([cx - 1, cy]) }
    }
  }

  return false
}

export type MazeSize = 6 | 9 | 12

/**
 * Generate a complete maze level from a seed.
 * gridSize: number of cells per side (6, 9, or 12)
 */
export function generateMaze(seed: number, gridSize: MazeSize): Level {
  const rng = mulberry32(seed)
  const boardSize = gridSize // board size matches grid size for clean 1:1

  const grid = generateMazeGrid(gridSize, rng)
  const walls = gridToWallSegments(grid, gridSize, boardSize)

  const half = boardSize / 2
  const cellSize = boardSize / gridSize

  // Start: top-left cell
  const startX = -half + 0.5 * cellSize
  const startZ = -half + 0.5 * cellSize
  // Goal: bottom-right cell
  const goalX = half - 0.5 * cellSize
  const goalZ = half - 0.5 * cellSize

  const startPos: [number, number] = [startX, startZ]
  const goalPos: [number, number] = [goalX, goalZ]

  // Place 3 traps avoiding start/goal (min distance 1.5)
  const trapPositions = placeItems(3, gridSize, boardSize, rng, [startPos, goalPos], 1.5) as TrapPosition[]

  // Place 3 gems avoiding start/goal/traps (min distance 1.0)
  const avoidForGems = [startPos, goalPos, ...trapPositions]
  const gemPositions = placeItems(3, gridSize, boardSize, rng, avoidForGems, 1.0) as GemPosition[]

  // Star thresholds based on grid size
  const baseTime = gridSize * 3
  const starThresholds: [number, number, number] = [
    baseTime,
    baseTime * 1.8,
    baseTime * 3,
  ]

  return {
    id: seed,
    name: `Generated Maze ${gridSize}x${gridSize}`,
    world: 0, // 0 = generated / daily
    boardSize: [boardSize, boardSize],
    startPosition: startPos,
    goalPosition: goalPos,
    walls,
    traps: trapPositions,
    gems: gemPositions as [GemPosition, GemPosition, GemPosition],
    starThresholds,
    wallHeight: 0.4,
    wallThickness: 0.15,
  }
}

/**
 * Generate today's daily maze.
 * Uses 12x12 grid seeded with YYYYMMDD.
 */
export function generateDailyMaze(): Level {
  const today = new Date()
  const seed = dateToSeed(today)
  const maze = generateMaze(seed, 12)
  maze.name = `Daily Maze #${getDayNumber(today)}`
  return maze
}

/**
 * Generate a random maze for free play.
 * Uses Math.random timestamp as seed.
 */
export function generateFreePlayMaze(gridSize: MazeSize): Level {
  const seed = Math.floor(Math.random() * 2147483647)
  const maze = generateMaze(seed, gridSize)
  maze.name = `Free Play ${gridSize}x${gridSize}`
  return maze
}
