/**
 * Ghost marble helper utilities.
 * Extracted to a separate file to satisfy react-refresh/only-export-components.
 */

import type { TrajectoryFrame } from './trajectoryRecorder'

/** World-specific ghost colors */
const WORLD_GHOST_COLORS: Record<number, string> = {
  0: '#FFD700', // Daily/Freeplay: gold
  1: '#FFD700', // World 1: gold
  2: '#00E5CC', // World 2: cyan
  3: '#FF8C00', // World 3: orange
}

/** Get ghost color for a world */
export function getGhostColor(worldId: number): string {
  return WORLD_GHOST_COLORS[worldId] ?? WORLD_GHOST_COLORS[0]
}

/** Duration of fade-out when ghost finishes (seconds) */
export const GHOST_FADE_DURATION = 0.5

/** Base opacity for the ghost marble */
export const GHOST_BASE_OPACITY = 0.35

/**
 * Find the two bracketing frames for a given time and interpolate position.
 * Returns null if trajectory is empty.
 */
export function interpolateTrajectory(
  trajectory: TrajectoryFrame[],
  time: number,
): { x: number; y: number; z: number; pastEnd: boolean } | null {
  if (trajectory.length === 0) return null

  const first = trajectory[0]
  const last = trajectory[trajectory.length - 1]

  // Before trajectory starts
  if (time < first.t) {
    return { x: first.x, y: first.y, z: first.z, pastEnd: false }
  }

  // Past the end of trajectory
  if (time >= last.t) {
    return { x: last.x, y: last.y, z: last.z, pastEnd: true }
  }

  // Binary search for bracketing frames
  let lo = 0
  let hi = trajectory.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (trajectory[mid].t <= time) {
      lo = mid
    } else {
      hi = mid
    }
  }

  const a = trajectory[lo]
  const b = trajectory[hi]
  const dt = b.t - a.t
  const alpha = dt > 0 ? (time - a.t) / dt : 0

  return {
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    z: a.z + (b.z - a.z) * alpha,
    pastEnd: false,
  }
}
