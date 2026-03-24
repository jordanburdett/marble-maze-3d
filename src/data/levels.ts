/** Wall segment: [x1, z1, x2, z2] — defines a wall from point A to point B */
export type WallSegment = [number, number, number, number]

/** Gem placement: [x, z] position on the board */
export type GemPosition = [number, number]

/** Trap hole: [x, z] position on the board */
export type TrapPosition = [number, number]

/** Moving wall definition: start pos, end pos, speed */
export interface MovingWallDef {
  /** Start position [x, z] */
  start: [number, number]
  /** End position [x, z] */
  end: [number, number]
  /** Speed in units per second */
  speed: number
  /** Wall length */
  length: number
  /** Orientation: 'h' horizontal, 'v' vertical */
  orientation: 'h' | 'v'
}

/** Ice patch: low-friction floor zone */
export interface IcePatchDef {
  /** Center position [x, z] */
  position: [number, number]
  /** Size [width, depth] */
  size: [number, number]
}

/** Rotating segment: circular spinning platform */
export interface RotatingSegmentDef {
  /** Center position [x, z] */
  position: [number, number]
  /** Radius of the rotating platform */
  radius: number
  /** Rotation speed in radians per second (positive = clockwise) */
  speed: number
}

/** Wind zone: lateral force area */
export interface WindZoneDef {
  /** Center position [x, z] */
  position: [number, number]
  /** Size [width, depth] */
  size: [number, number]
  /** Force direction [x, z] normalized */
  direction: [number, number]
  /** Force strength */
  strength: number
}

export interface Level {
  id: number
  name: string
  /** Which world this level belongs to (1, 2, or 3) */
  world: number
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
  /** Moving walls (World 2+) */
  movingWalls?: MovingWallDef[]
  /** Ice patches (World 2+) */
  icePatches?: IcePatchDef[]
  /** Rotating segments (World 3) */
  rotatingSegments?: RotatingSegmentDef[]
  /** Wind zones (World 3) */
  windZones?: WindZoneDef[]
}

export interface WorldMeta {
  id: number
  name: string
  /** Theme colors: [primary, secondary, accent] */
  colors: [string, string, string]
  /** Level ID range: [start, end] inclusive */
  levelRange: [number, number]
  /** Stars needed to unlock this world (0 = always unlocked) */
  starsToUnlock: number
}

const WALL_H = 0.4
const WALL_T = 0.15

// ========== WORLD 1: WOODEN WORKSHOP (Levels 1–10) ==========
// Simple corridor mazes, 1-2 traps, generous star thresholds

const WORLD_1_LEVELS: Level[] = [
  // Level 1: Simple corridor — straight path with one turn
  {
    id: 1, name: 'First Steps', world: 1,
    boardSize: [6, 6],
    startPosition: [-2, -2],
    goalPosition: [2, 2],
    walls: [
      [-3, -3, 3, -3], [-3, 3, 3, 3], [-3, -3, -3, 3], [3, -3, 3, 3],
      [-1, -3, -1, 0], [-1, 0, 1.5, 0], [1.5, 0, 1.5, 3],
    ],
    traps: [[0.5, -1.5]],
    gems: [[-2, 0], [0, 1.5], [2, 0.5]],
    starThresholds: [8, 15, 25],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 2: Zigzag — two turns with traps
  {
    id: 2, name: 'Zigzag Path', world: 1,
    boardSize: [6, 6],
    startPosition: [-2, -2],
    goalPosition: [2, 2],
    walls: [
      [-3, -3, 3, -3], [-3, 3, 3, 3], [-3, -3, -3, 3], [3, -3, 3, 3],
      [-1.5, -3, -1.5, -0.5], [0, 0.5, 0, 3], [1.5, -3, 1.5, -0.5],
      [-1.5, -0.5, 1.5, -0.5], [0, 0.5, 1.5, 0.5],
    ],
    traps: [[-0.5, 1.5], [1, -1.5]],
    gems: [[-2, 1], [0.8, -1], [2, 1.5]],
    starThresholds: [10, 18, 30],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 3: The Fork — choose your path
  {
    id: 3, name: 'The Fork', world: 1,
    boardSize: [8, 6],
    startPosition: [-3, 0],
    goalPosition: [3, 0],
    walls: [
      [-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3],
      [-1, -1.5, -1, 1.5], [1, -3, 1, -1], [1, 1, 1, 3],
      [-1, -1.5, 1, -1.5], [2, -2, 2, -0.5],
      [-1, 1.5, 1, 1.5], [2, 0.5, 2, 2],
    ],
    traps: [[0, -2.2], [0, 2.2]],
    gems: [[-2.5, -2], [0, 0], [2.5, 2]],
    starThresholds: [12, 20, 35],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 4: Spiral approach
  {
    id: 4, name: 'Spiral Run', world: 1,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [0, 0],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [2.5, -4, 2.5, 2.5], [-2.5, 2.5, 2.5, 2.5], [-2.5, -2.5, -2.5, 2.5],
      [-2.5, -2.5, 1, -2.5], [1, -2.5, 1, 1], [-1, 1, 1, 1], [-1, -1, -1, 1],
    ],
    traps: [[2, -2], [-2, 0]],
    gems: [[3, -3], [-3, 3], [0, -1.5]],
    starThresholds: [15, 25, 40],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 5: The Gauntlet — narrow passages
  {
    id: 5, name: 'The Gauntlet', world: 1,
    boardSize: [10, 6],
    startPosition: [-4, 0],
    goalPosition: [4, 0],
    walls: [
      [-5, -3, 5, -3], [-5, 3, 5, 3], [-5, -3, -5, 3], [5, -3, 5, 3],
      [-3, -3, -3, -0.6], [-3, 0.6, -3, 3],
      [-1, -3, -1, -0.6], [-1, 0.6, -1, 3],
      [1, -3, 1, -0.6], [1, 0.6, 1, 3],
      [3, -3, 3, -0.6], [3, 0.6, 3, 3],
      [-2, -1.5, -2, 1.5], [0, -1.5, 0, 1.5], [2, -1.5, 2, 1.5],
    ],
    traps: [[-2, 0], [2, 0]],
    gems: [[-3.5, 2], [0, 2], [3.5, -2]],
    starThresholds: [18, 30, 45],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 6: U-Turn — double-back maze
  {
    id: 6, name: 'U-Turn', world: 1,
    boardSize: [8, 6],
    startPosition: [-3, -2],
    goalPosition: [-3, 2],
    walls: [
      [-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3],
      [-2, -3, -2, 1], [0, -1, 0, 3], [2, -3, 2, 1],
      [-2, 1, 0, 1], [0, -1, 2, -1],
    ],
    traps: [[-1, -2], [1, 2]],
    gems: [[-3, 0], [1, 0], [3, -2]],
    starThresholds: [14, 22, 35],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 7: The Maze — classic grid
  {
    id: 7, name: 'Classic Maze', world: 1,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [3, 3],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [-2, -4, -2, -1], [-2, 1, -2, 4],
      [0, -2, 0, 2],
      [2, -4, 2, -1], [2, 1, 2, 4],
      [-4, -1, -2, -1], [0, -2, 2, -2],
      [-2, 1, 0, 1], [0, 2, 4, 2],
    ],
    traps: [[-1, 0], [1, -1]],
    gems: [[-3, 2], [0, -3], [3, 0]],
    starThresholds: [16, 26, 40],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 8: Pinball Alley — obstacles in open space
  {
    id: 8, name: 'Pinball Alley', world: 1,
    boardSize: [10, 6],
    startPosition: [-4, 0],
    goalPosition: [4, 0],
    walls: [
      [-5, -3, 5, -3], [-5, 3, 5, 3], [-5, -3, -5, 3], [5, -3, 5, 3],
      [-3, -1.5, -3, 1.5], [-1, -2, -1, -0.5], [-1, 0.5, -1, 2],
      [1, -2, 1, -0.5], [1, 0.5, 1, 2], [3, -1.5, 3, 1.5],
      [-2, -2, 0, -2], [-2, 2, 0, 2], [2, -1, 2, 1],
    ],
    traps: [[0, 0], [2, -2]],
    gems: [[-4, 2], [0, -2.5], [4, -2]],
    starThresholds: [16, 28, 42],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 9: The Labyrinth — many dead ends
  {
    id: 9, name: 'The Labyrinth', world: 1,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-3, -4, -3, -1], [-3, 1, -3, 4],
      [-1, -2, -1, 2],
      [1, -4, 1, -1], [1, 1, 1, 4],
      [3, -2, 3, 2],
      [-3, -1, -1, -1], [-3, 1, -1, 1],
      [-1, -2, 1, -2], [-1, 2, 1, 2],
      [1, -1, 3, -1], [1, 1, 3, 1],
      [3, -2, 5, -2], [3, 2, 5, 2],
    ],
    traps: [[-2, 0], [2, 0]],
    gems: [[-4, 3], [0, 0], [4, -3]],
    starThresholds: [20, 32, 48],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
  // Level 10: Workshop Final — big spiral with dead-ends
  {
    id: 10, name: 'Workshop Final', world: 1,
    boardSize: [10, 10],
    startPosition: [-4, -4],
    goalPosition: [0, 0],
    walls: [
      [-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5],
      [3, -5, 3, 3], [-3, 3, 3, 3], [-3, -3, -3, 3],
      [-3, -3, 1, -3], [1, -3, 1, 1], [-1, 1, 1, 1], [-1, -1, -1, 1],
      // Dead-end extensions
      [3, -2, 5, -2], [-5, -2, -3, -2],
      [-1, -3, -1, -2],
    ],
    traps: [[2, -4], [-2, 2], [4, 4]],
    gems: [[4, -4], [-4, 4], [0, -2]],
    starThresholds: [22, 35, 55],
    wallHeight: WALL_H, wallThickness: WALL_T,
  },
]

// ========== WORLD 2: CRYSTAL CAVERN (Levels 11–20) ==========
// Moving walls, ice patches, 3-4 traps, tighter thresholds

const WORLD_2_LEVELS: Level[] = [
  // Level 11: Crystal Entry
  {
    id: 11, name: 'Crystal Entry', world: 2,
    boardSize: [8, 6],
    startPosition: [-3, -2],
    goalPosition: [3, 2],
    walls: [
      [-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3],
      [-1, -3, -1, 0], [1, 0, 1, 3],
      [-1, 0, 1, 0],
    ],
    traps: [[0, -2], [-2, 1], [2, -1]],
    gems: [[-3, 1], [0, 2], [3, -2]],
    starThresholds: [10, 18, 28],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [-2, 1.5], end: [2, 1.5], speed: 1.5, length: 1.5, orientation: 'v' },
    ],
  },
  // Level 12: Frozen Floor
  {
    id: 12, name: 'Frozen Floor', world: 2,
    boardSize: [8, 6],
    startPosition: [-3, 0],
    goalPosition: [3, 0],
    walls: [
      [-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3],
      [-1, -3, -1, -1], [-1, 1, -1, 3],
      [1, -3, 1, -1], [1, 1, 1, 3],
    ],
    traps: [[-2, -2], [0, 0], [2, 2]],
    gems: [[-3, 2], [0, -2], [3, -2]],
    starThresholds: [12, 20, 32],
    wallHeight: WALL_H, wallThickness: WALL_T,
    icePatches: [
      { position: [0, 0], size: [2, 2] },
    ],
  },
  // Level 13: Sliding Walls
  {
    id: 13, name: 'Sliding Walls', world: 2,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [3, 3],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [-2, -4, -2, 0], [0, 0, 0, 4],
      [2, -4, 2, 0],
    ],
    traps: [[-1, -2], [1, 2], [3, -3]],
    gems: [[-3, 2], [1, -3], [3, 0]],
    starThresholds: [14, 24, 38],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [-3, -1], end: [1, -1], speed: 1.2, length: 2, orientation: 'h' },
      { start: [-1, 2], end: [3, 2], speed: 1.0, length: 2, orientation: 'h' },
    ],
  },
  // Level 14: Ice Bridge
  {
    id: 14, name: 'Ice Bridge', world: 2,
    boardSize: [10, 6],
    startPosition: [-4, 0],
    goalPosition: [4, 0],
    walls: [
      [-5, -3, 5, -3], [-5, 3, 5, 3], [-5, -3, -5, 3], [5, -3, 5, 3],
      [-3, -3, -3, -0.8], [-3, 0.8, -3, 3],
      [0, -3, 0, -0.8], [0, 0.8, 0, 3],
      [3, -3, 3, -0.8], [3, 0.8, 3, 3],
    ],
    traps: [[-1.5, 0], [1.5, 0], [-4, -2], [4, 2]],
    gems: [[-4, 2], [0, -2], [4, -2]],
    starThresholds: [15, 26, 40],
    wallHeight: WALL_H, wallThickness: WALL_T,
    icePatches: [
      { position: [-1.5, 0], size: [3, 1.6] },
      { position: [1.5, 0], size: [3, 1.6] },
    ],
  },
  // Level 15: Guard Patrol
  {
    id: 15, name: 'Guard Patrol', world: 2,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [3, 3],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [-2, -4, -2, 0], [0, 0, 0, 4],
      [-2, 0, 0, 0],
    ],
    traps: [[2, -2], [-2, 2], [0, -3]],
    gems: [[-3, 2], [0, -1], [3, -3]],
    starThresholds: [14, 24, 36],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [1, -3], end: [1, 1], speed: 1.5, length: 1.5, orientation: 'h' },
      { start: [-1, 1], end: [-1, -3], speed: 1.2, length: 1.5, orientation: 'h' },
    ],
  },
  // Level 16: Crystal Corridor
  {
    id: 16, name: 'Crystal Corridor', world: 2,
    boardSize: [10, 6],
    startPosition: [-4, -2],
    goalPosition: [4, 2],
    walls: [
      [-5, -3, 5, -3], [-5, 3, 5, 3], [-5, -3, -5, 3], [5, -3, 5, 3],
      [-3, -1, -3, 3], [-1, -3, -1, 1], [1, -1, 1, 3], [3, -3, 3, 1],
      [-3, -1, -1, -1], [-1, 1, 1, 1], [1, -1, 3, -1], [3, 1, 5, 1],
    ],
    traps: [[-2, 2], [0, 0], [2, -2], [4, 0]],
    gems: [[-4, 2], [0, -2], [4, -2]],
    starThresholds: [18, 28, 42],
    wallHeight: WALL_H, wallThickness: WALL_T,
    icePatches: [
      { position: [-2, -2], size: [2, 2] },
      { position: [2, 2], size: [2, 2] },
    ],
  },
  // Level 17: Pendulum Pass
  {
    id: 17, name: 'Pendulum Pass', world: 2,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-2, -4, -2, 0], [0, 0, 0, 4],
      [2, -4, 2, 0],
      [-2, 0, 0, 0],
    ],
    traps: [[-1, -2], [1, 2], [3, -3], [-3, 3]],
    gems: [[-4, 3], [0, -3], [4, -3]],
    starThresholds: [18, 30, 45],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [-3, -2], end: [1, -2], speed: 2.0, length: 2, orientation: 'h' },
      { start: [-1, 2], end: [3, 2], speed: 1.8, length: 2, orientation: 'h' },
      { start: [3, -1], end: [3, 3], speed: 1.5, length: 1.5, orientation: 'v' },
    ],
  },
  // Level 18: Slippery Slopes
  {
    id: 18, name: 'Slippery Slopes', world: 2,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-3, -4, -3, 1], [-1, -1, -1, 4],
      [1, -4, 1, 1], [3, -1, 3, 4],
    ],
    traps: [[-2, -2], [0, 0], [2, 2], [4, -3]],
    gems: [[-4, 3], [0, -3], [4, -1]],
    starThresholds: [20, 32, 48],
    wallHeight: WALL_H, wallThickness: WALL_T,
    icePatches: [
      { position: [-2, 0], size: [2, 4] },
      { position: [2, 0], size: [2, 4] },
    ],
  },
  // Level 19: Crystal Cavern Depths
  {
    id: 19, name: 'Cavern Depths', world: 2,
    boardSize: [10, 10],
    startPosition: [-4, -4],
    goalPosition: [4, 4],
    walls: [
      [-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5],
      [-3, -5, -3, -1], [-3, 1, -3, 5],
      [-1, -3, -1, 3],
      [1, -5, 1, -1], [1, 1, 1, 5],
      [3, -3, 3, 3],
      [-3, -1, -1, -1], [-1, 1, 1, 1],
      [1, -1, 3, -1], [3, 1, 5, 1],
      [-5, 1, -3, 1], [-3, -1, -1, -1],
    ],
    traps: [[-2, -3], [0, 0], [2, 3], [-4, 4]],
    gems: [[-4, 2], [2, -4], [4, 0]],
    starThresholds: [22, 35, 52],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [-2, -3], end: [2, -3], speed: 1.5, length: 2, orientation: 'h' },
      { start: [-2, 3], end: [2, 3], speed: 1.2, length: 2, orientation: 'h' },
    ],
    icePatches: [
      { position: [0, 0], size: [2, 2] },
    ],
  },
  // Level 20: Crystal Boss — ultimate W2 challenge
  {
    id: 20, name: 'Crystal Boss', world: 2,
    boardSize: [10, 10],
    startPosition: [-4, -4],
    goalPosition: [0, 0],
    walls: [
      [-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5],
      [3, -5, 3, 3], [-3, 3, 3, 3], [-3, -3, -3, 3],
      [-3, -3, 1, -3], [1, -3, 1, 1], [-1, 1, 1, 1], [-1, -1, -1, 1],
      // Extra barriers
      [-5, -2, -3, -2], [3, -2, 5, -2],
      [-5, 2, -3, 2], [3, 2, 5, 2],
    ],
    traps: [[2, -4], [-2, 2], [4, 4], [-4, -1]],
    gems: [[4, -4], [-4, 4], [2, 0]],
    starThresholds: [25, 40, 60],
    wallHeight: WALL_H, wallThickness: WALL_T,
    movingWalls: [
      { start: [-2, -4], end: [-2, 0], speed: 1.8, length: 2, orientation: 'h' },
      { start: [2, 0], end: [2, 4], speed: 1.5, length: 2, orientation: 'h' },
    ],
    icePatches: [
      { position: [-2, -2], size: [2, 2] },
      { position: [2, 2], size: [2, 2] },
    ],
  },
]

// ========== WORLD 3: SKY TEMPLE (Levels 21–30) ==========
// Rotating segments, wind zones, hardest levels, tightest thresholds

const WORLD_3_LEVELS: Level[] = [
  // Level 21: Sky Gate
  {
    id: 21, name: 'Sky Gate', world: 3,
    boardSize: [8, 6],
    startPosition: [-3, -2],
    goalPosition: [3, 2],
    walls: [
      [-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3],
      [-1, -3, -1, 1], [1, -1, 1, 3],
    ],
    traps: [[0, -2], [2, 0], [-2, 2]],
    gems: [[-3, 2], [0, 0], [3, -2]],
    starThresholds: [10, 18, 28],
    wallHeight: WALL_H, wallThickness: WALL_T,
    windZones: [
      { position: [0, 0], size: [2, 2], direction: [1, 0], strength: 3 },
    ],
  },
  // Level 22: Spinning Platform
  {
    id: 22, name: 'Spinning Platform', world: 3,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [3, 3],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [-2, -4, -2, -1], [2, 1, 2, 4],
      [-2, -1, 2, -1], [-2, 1, 2, 1],
    ],
    traps: [[-1, -3], [1, 3], [3, -3]],
    gems: [[-3, 2], [0, -3], [3, 0]],
    starThresholds: [12, 22, 34],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [0, 0], radius: 1.2, speed: 0.8 },
    ],
  },
  // Level 23: Wind Tunnel
  {
    id: 23, name: 'Wind Tunnel', world: 3,
    boardSize: [10, 6],
    startPosition: [-4, 0],
    goalPosition: [4, 0],
    walls: [
      [-5, -3, 5, -3], [-5, 3, 5, 3], [-5, -3, -5, 3], [5, -3, 5, 3],
      [-2, -3, -2, -1], [-2, 1, -2, 3],
      [0, -3, 0, -1], [0, 1, 0, 3],
      [2, -3, 2, -1], [2, 1, 2, 3],
    ],
    traps: [[-1, 0], [1, 0], [3, -2], [-3, 2]],
    gems: [[-4, -2], [0, 2], [4, -2]],
    starThresholds: [14, 24, 38],
    wallHeight: WALL_H, wallThickness: WALL_T,
    windZones: [
      { position: [-1, 0], size: [2, 2], direction: [0, -1], strength: 4 },
      { position: [1, 0], size: [2, 2], direction: [0, 1], strength: 4 },
    ],
  },
  // Level 24: Cyclone Cross
  {
    id: 24, name: 'Cyclone Cross', world: 3,
    boardSize: [8, 8],
    startPosition: [-3, -3],
    goalPosition: [3, 3],
    walls: [
      [-4, -4, 4, -4], [-4, 4, 4, 4], [-4, -4, -4, 4], [4, -4, 4, 4],
      [-2, -2, -2, 2], [2, -2, 2, 2],
      [-2, -2, 2, -2], [-2, 2, 2, 2],
    ],
    traps: [[-1, -1], [1, 1], [-3, 3], [3, -3]],
    gems: [[-3, 0], [0, -3], [3, 0]],
    starThresholds: [14, 24, 36],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [0, 0], radius: 1.5, speed: 1.0 },
    ],
    windZones: [
      { position: [0, 3], size: [4, 2], direction: [-1, 0], strength: 3 },
    ],
  },
  // Level 25: Temple Maze
  {
    id: 25, name: 'Temple Maze', world: 3,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-3, -4, -3, 0], [-1, 0, -1, 4],
      [1, -4, 1, 0], [3, 0, 3, 4],
      [-3, 0, -1, 0], [1, 0, 3, 0],
    ],
    traps: [[-2, -2], [0, 2], [2, -2], [4, 0]],
    gems: [[-4, 3], [0, -3], [4, -3]],
    starThresholds: [18, 30, 45],
    wallHeight: WALL_H, wallThickness: WALL_T,
    windZones: [
      { position: [-2, 2], size: [2, 2], direction: [1, 0], strength: 3.5 },
      { position: [2, -2], size: [2, 2], direction: [-1, 0], strength: 3.5 },
    ],
  },
  // Level 26: Dual Spinners
  {
    id: 26, name: 'Dual Spinners', world: 3,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-1, -4, -1, -1], [-1, 1, -1, 4],
      [1, -4, 1, -1], [1, 1, 1, 4],
    ],
    traps: [[-3, 0], [0, -3], [0, 3], [3, 0]],
    gems: [[-4, 3], [0, 0], [4, -3]],
    starThresholds: [16, 28, 42],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [-2.5, 0], radius: 1.2, speed: 1.0 },
      { position: [2.5, 0], radius: 1.2, speed: -1.0 },
    ],
  },
  // Level 27: Gale Force
  {
    id: 27, name: 'Gale Force', world: 3,
    boardSize: [10, 8],
    startPosition: [-4, -3],
    goalPosition: [4, 3],
    walls: [
      [-5, -4, 5, -4], [-5, 4, 5, 4], [-5, -4, -5, 4], [5, -4, 5, 4],
      [-3, -4, -3, 1], [-1, -1, -1, 4],
      [1, -4, 1, 1], [3, -1, 3, 4],
      [-3, 1, -1, 1], [1, -1, 3, -1],
    ],
    traps: [[-2, -2], [0, 0], [2, 2], [-4, 3]],
    gems: [[-4, -3], [0, 3], [4, -3]],
    starThresholds: [18, 30, 45],
    wallHeight: WALL_H, wallThickness: WALL_T,
    windZones: [
      { position: [-2, -2], size: [2, 2], direction: [0, 1], strength: 4 },
      { position: [0, 0], size: [2, 2], direction: [1, 0], strength: 4 },
      { position: [2, 2], size: [2, 2], direction: [0, -1], strength: 4 },
    ],
  },
  // Level 28: Vortex
  {
    id: 28, name: 'Vortex', world: 3,
    boardSize: [10, 10],
    startPosition: [-4, -4],
    goalPosition: [0, 0],
    walls: [
      [-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5],
      [3, -5, 3, 3], [-3, 3, 3, 3], [-3, -3, -3, 3],
      [-3, -3, 1, -3], [1, -3, 1, 1], [-1, 1, 1, 1], [-1, -1, -1, 1],
    ],
    traps: [[2, -4], [-2, 2], [4, 4], [-4, -1]],
    gems: [[4, -4], [-4, 4], [2, 0]],
    starThresholds: [22, 35, 52],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [0, 0], radius: 0.8, speed: 1.2 },
      { position: [-2, -2], radius: 1.0, speed: -0.8 },
    ],
    windZones: [
      { position: [2, -2], size: [2, 2], direction: [0, 1], strength: 3 },
    ],
  },
  // Level 29: Sky Fortress
  {
    id: 29, name: 'Sky Fortress', world: 3,
    boardSize: [10, 10],
    startPosition: [-4, -4],
    goalPosition: [4, 4],
    walls: [
      [-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5],
      [-3, -5, -3, -1], [-3, 1, -3, 5],
      [-1, -3, -1, 3],
      [1, -5, 1, -1], [1, 1, 1, 5],
      [3, -3, 3, 3],
      [-3, -1, -1, -1], [-1, 1, 1, 1],
      [1, -1, 3, -1], [3, 1, 5, 1],
    ],
    traps: [[-2, -3], [0, 0], [2, 3], [4, -4]],
    gems: [[-4, 4], [0, -4], [4, 0]],
    starThresholds: [24, 38, 56],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [-2, 0], radius: 1.0, speed: 0.9 },
      { position: [2, 0], radius: 1.0, speed: -0.9 },
    ],
    windZones: [
      { position: [0, -2], size: [2, 2], direction: [1, 0], strength: 3.5 },
      { position: [0, 2], size: [2, 2], direction: [-1, 0], strength: 3.5 },
    ],
  },
  // Level 30: Temple Ascension — final boss
  {
    id: 30, name: 'Temple Ascension', world: 3,
    boardSize: [12, 12],
    startPosition: [-5, -5],
    goalPosition: [0, 0],
    walls: [
      [-6, -6, 6, -6], [-6, 6, 6, 6], [-6, -6, -6, 6], [6, -6, 6, 6],
      [4, -6, 4, 4], [-4, 4, 4, 4], [-4, -4, -4, 4],
      [-4, -4, 2, -4], [2, -4, 2, 2], [-2, 2, 2, 2], [-2, -2, -2, 2],
      // Extra obstacles
      [-6, -2, -4, -2], [4, -2, 6, -2],
      [-6, 2, -4, 2], [4, 2, 6, 2],
      [-2, -2, 0, -2],
    ],
    traps: [[3, -5], [-3, 3], [5, 5], [-5, -1], [0, -3]],
    gems: [[5, -5], [-5, 5], [0, -1]],
    starThresholds: [28, 45, 65],
    wallHeight: WALL_H, wallThickness: WALL_T,
    rotatingSegments: [
      { position: [0, 0], radius: 1.0, speed: 1.2 },
      { position: [-3, -3], radius: 1.2, speed: -0.8 },
      { position: [3, 3], radius: 1.2, speed: 0.8 },
    ],
    windZones: [
      { position: [-3, 0], size: [2, 3], direction: [0, 1], strength: 4 },
      { position: [3, 0], size: [2, 3], direction: [0, -1], strength: 4 },
    ],
  },
]

// ========== ALL LEVELS ==========

export const ALL_LEVELS: Level[] = [
  ...WORLD_1_LEVELS,
  ...WORLD_2_LEVELS,
  ...WORLD_3_LEVELS,
]

export const TOTAL_LEVEL_COUNT = ALL_LEVELS.length

/** Backward-compat: World 1 exports */
export { WORLD_1_LEVELS }
export const WORLD_1_LEVEL_COUNT = WORLD_1_LEVELS.length

export const WORLDS: WorldMeta[] = [
  {
    id: 1,
    name: 'Wooden Workshop',
    colors: ['#8B6914', '#C4883C', '#E8D5B7'],
    levelRange: [1, 10],
    starsToUnlock: 0,
  },
  {
    id: 2,
    name: 'Crystal Cavern',
    colors: ['#1A3A5C', '#00D4FF', '#7EB8DA'],
    levelRange: [11, 20],
    starsToUnlock: 15,
  },
  {
    id: 3,
    name: 'Sky Temple',
    colors: ['#8B7514', '#FFD700', '#FFF1B8'],
    levelRange: [21, 30],
    starsToUnlock: 35,
  },
]

/** Get a level by ID (1-based) */
export function getLevel(id: number): Level | undefined {
  return ALL_LEVELS.find(l => l.id === id)
}

/** Get all levels for a given world */
export function getWorldLevels(worldId: number): Level[] {
  return ALL_LEVELS.filter(l => l.world === worldId)
}

/** Get world metadata by ID */
export function getWorld(worldId: number): WorldMeta | undefined {
  return WORLDS.find(w => w.id === worldId)
}
