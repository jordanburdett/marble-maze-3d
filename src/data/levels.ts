/** Wall segment: [x1, z1, x2, z2] — defines a wall from point A to point B */
export type WallSegment = [number, number, number, number]

/** Gem placement: [x, z] position on the board */
export type GemPosition = [number, number]

/** Trap hole: [x, z] position on the board */
export type TrapPosition = [number, number]

export interface Level {
  id: number
  name: string
  /** Board dimensions [width, depth] */
  boardSize: [number, number]
  /** Marble start position [x, z] */
  startPosition: [number, number]
  /** Goal position [x, z] */
  goalPosition: [number, number]
  /** Wall segments defining the maze layout */
  walls: WallSegment[]
  /** Trap hole positions */
  traps: TrapPosition[]
  /** Gem positions (always 3 per level) */
  gems: [GemPosition, GemPosition, GemPosition]
  /** Star time thresholds in seconds: [3-star, 2-star, 1-star] */
  starThresholds: [number, number, number]
  /** Wall height (default 0.4) */
  wallHeight?: number
  /** Wall thickness (default 0.15) */
  wallThickness?: number
}

const WALL_H = 0.4
const WALL_T = 0.15

/**
 * World 1: Wooden Workshop — 5 levels of increasing difficulty.
 * Board coordinate system: center is (0,0), X goes right, Z goes "down" (toward camera).
 * All walls are axis-aligned rectangles defined by start/end points.
 */
export const WORLD_1_LEVELS: Level[] = [
  // Level 1: Simple corridor — straight path with one turn
  {
    id: 1,
    name: 'First Steps',
    boardSize: [6, 6],
    startPosition: [-2, -2],
    goalPosition: [2, 2],
    walls: [
      // Outer walls
      [-3, -3, 3, -3],   // top
      [-3, 3, 3, 3],     // bottom
      [-3, -3, -3, 3],   // left
      [3, -3, 3, 3],     // right
      // Inner walls creating an L-shaped corridor
      [-1, -3, -1, 0],   // vertical wall from top
      [-1, 0, 1.5, 0],   // horizontal connector
      [1.5, 0, 1.5, 3],  // wall blocking direct path
    ],
    traps: [[0.5, -1.5]],
    gems: [[-2, 0], [0, 1.5], [2, 0.5]],
    starThresholds: [8, 15, 25],
    wallHeight: WALL_H,
    wallThickness: WALL_T,
  },
  // Level 2: Zigzag — two turns with a trap
  {
    id: 2,
    name: 'Zigzag Path',
    boardSize: [6, 6],
    startPosition: [-2, -2],
    goalPosition: [2, 2],
    walls: [
      // Outer walls
      [-3, -3, 3, -3],
      [-3, 3, 3, 3],
      [-3, -3, -3, 3],
      [3, -3, 3, 3],
      // Zigzag barriers
      [-1.5, -3, -1.5, -0.5],
      [0, 0.5, 0, 3],
      [1.5, -3, 1.5, -0.5],
      [-1.5, -0.5, 1.5, -0.5],
      [0, 0.5, 1.5, 0.5],
    ],
    traps: [[-0.5, 1.5], [1, -1.5]],
    gems: [[-2, 1], [0.8, -1], [2, 1.5]],
    starThresholds: [10, 18, 30],
    wallHeight: WALL_H,
    wallThickness: WALL_T,
  },
  // Level 3: The Fork — choose your path
  {
    id: 3,
    name: 'The Fork',
    boardSize: [8, 6],
    startPosition: [-3, 0],
    goalPosition: [3, 0],
    walls: [
      // Outer walls
      [-4, -3, 4, -3],
      [-4, 3, 4, 3],
      [-4, -3, -4, 3],
      [4, -3, 4, 3],
      // Central divider with two paths
      [-1, -1.5, -1, 1.5],
      [1, -3, 1, -1],
      [1, 1, 1, 3],
      // Upper path obstacles
      [-1, -1.5, 1, -1.5],
      [2, -2, 2, -0.5],
      // Lower path obstacles
      [-1, 1.5, 1, 1.5],
      [2, 0.5, 2, 2],
    ],
    traps: [[0, -2.2], [0, 2.2]],
    gems: [[-2.5, -2], [0, 0], [2.5, 2]],
    starThresholds: [12, 20, 35],
    wallHeight: WALL_H,
    wallThickness: WALL_T,
  },
  // Level 4: Spiral approach
  {
    id: 4,
    name: 'Spiral Run',
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [0, 0],
    walls: [
      // Outer walls
      [-4, -4, 4, -4],
      [-4, 4, 4, 4],
      [-4, -4, -4, 4],
      [4, -4, 4, 4],
      // Spiral walls (outside-in)
      [2.5, -4, 2.5, 2.5],
      [-2.5, 2.5, 2.5, 2.5],
      [-2.5, -2.5, -2.5, 2.5],
      [-2.5, -2.5, 1, -2.5],
      [1, -2.5, 1, 1],
      [-1, 1, 1, 1],
      [-1, -1, -1, 1],
    ],
    traps: [[2, -2], [-2, 0], [0.5, 2]],
    gems: [[3, -3], [-3, 3], [0, -1.5]],
    starThresholds: [15, 25, 40],
    wallHeight: WALL_H,
    wallThickness: WALL_T,
  },
  // Level 5: The Gauntlet — narrow passages, multiple traps
  {
    id: 5,
    name: 'The Gauntlet',
    boardSize: [10, 6],
    startPosition: [-4, 0],
    goalPosition: [4, 0],
    walls: [
      // Outer walls
      [-5, -3, 5, -3],
      [-5, 3, 5, 3],
      [-5, -3, -5, 3],
      [5, -3, 5, 3],
      // Series of narrow passages
      [-3, -3, -3, -0.6],
      [-3, 0.6, -3, 3],
      [-1, -3, -1, -0.6],
      [-1, 0.6, -1, 3],
      [1, -3, 1, -0.6],
      [1, 0.6, 1, 3],
      [3, -3, 3, -0.6],
      [3, 0.6, 3, 3],
      // Cross barriers making it tricky
      [-2, -1.5, -2, 1.5],
      [0, -1.5, 0, 1.5],
      [2, -1.5, 2, 1.5],
    ],
    traps: [[-2, 0], [0, 0], [2, 0]],
    gems: [[-3.5, 2], [0, 2], [3.5, -2]],
    starThresholds: [18, 30, 45],
    wallHeight: WALL_H,
    wallThickness: WALL_T,
  },
]

/** Get a level by ID (1-based) */
export function getLevel(id: number): Level | undefined {
  return WORLD_1_LEVELS.find(l => l.id === id)
}

/** Total number of levels in World 1 */
export const WORLD_1_LEVEL_COUNT = WORLD_1_LEVELS.length
