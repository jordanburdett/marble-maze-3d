/**
 * Ghost trajectory persistence layer.
 * Stores best-run trajectories per level in localStorage.
 * Separate key from main game data to keep ghost data isolated.
 */

import type { TrajectoryFrame } from './trajectoryRecorder'

const STORAGE_KEY = 'marble-maze-3d-ghosts'

/** Compressed flat-array format for a single ghost run */
interface StoredGhost {
  /** Level completion time (seconds) */
  time: number
  /** Flat array: [x0, y0, z0, speed0, t0, x1, y1, z1, speed1, t1, ...] */
  data: number[]
}

/** Full storage shape: ghost runs keyed by level ID */
type GhostStore = Record<string, StoredGhost>

/** Round a number to 2 decimal places for storage compression */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Compress TrajectoryFrame[] to flat number array with 2-decimal rounding */
function compress(frames: TrajectoryFrame[]): number[] {
  const arr: number[] = []
  for (const f of frames) {
    arr.push(round2(f.x), round2(f.y), round2(f.z), round2(f.speed), round2(f.t))
  }
  return arr
}

/** Decompress flat number array back to TrajectoryFrame[] */
function decompress(data: number[]): TrajectoryFrame[] {
  const frames: TrajectoryFrame[] = []
  for (let i = 0; i + 4 < data.length; i += 5) {
    frames.push({
      x: data[i],
      y: data[i + 1],
      z: data[i + 2],
      speed: data[i + 3],
      t: data[i + 4],
    })
  }
  return frames
}

/** Load the entire ghost store from localStorage */
function loadStore(): GhostStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as GhostStore
  } catch {
    return {}
  }
}

/** Persist the entire ghost store to localStorage */
function persistStore(store: GhostStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    // Quota exceeded — try evicting oldest ghosts
    return evictAndRetry(store)
  }
}

/**
 * Evict ghosts one at a time (longest-stored first) and retry save.
 * Returns true if eventually successful, false if still failing.
 */
function evictAndRetry(store: GhostStore): boolean {
  const keys = Object.keys(store)
  // Remove entries one by one until we can fit
  while (keys.length > 0) {
    const evictKey = keys.shift()!
    delete store[evictKey]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      return true
    } catch {
      // Keep evicting
    }
  }
  return false
}

export const ghostStorage = {
  /**
   * Save a ghost trajectory for a level.
   * Only overwrites if the new time is strictly better (lower) than stored.
   * Returns true if saved, false if skipped or failed.
   */
  saveGhost(levelId: number, trajectory: TrajectoryFrame[], time: number): boolean {
    const store = loadStore()
    const key = String(levelId)
    const existing = store[key]

    // Only overwrite if new time is strictly better
    if (existing && time >= existing.time) {
      return false
    }

    store[key] = {
      time: round2(time),
      data: compress(trajectory),
    }

    return persistStore(store)
  },

  /**
   * Load a ghost trajectory for a level.
   * Returns null if no ghost exists.
   */
  loadGhost(levelId: number): { trajectory: TrajectoryFrame[]; time: number } | null {
    const store = loadStore()
    const entry = store[String(levelId)]
    if (!entry) return null
    return {
      trajectory: decompress(entry.data),
      time: entry.time,
    }
  },

  /** Check if a ghost exists for a given level. */
  hasGhost(levelId: number): boolean {
    const store = loadStore()
    return String(levelId) in store
  },

  /** Remove ghost data for a specific level. */
  removeGhost(levelId: number): void {
    const store = loadStore()
    delete store[String(levelId)]
    persistStore(store)
  },

  /** Clear all ghost data. */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  },
}
