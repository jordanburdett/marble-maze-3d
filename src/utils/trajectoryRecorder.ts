/**
 * Shared mutable state for recording marble trajectories.
 * Written by Marble each physics frame, read by ghost system on level complete.
 * Follows the same pattern as trailState.ts — mutable shared singleton.
 */

export interface TrajectoryFrame {
  x: number
  y: number
  z: number
  speed: number
  t: number
}

/**
 * Trajectory recorder — captures marble position/speed each frame.
 * Throttles to every 3rd physics frame (~20 samples/sec at 60fps).
 */
export const trajectoryRecorder = {
  _frames: [] as TrajectoryFrame[],
  _recording: false,
  _frameCount: 0,

  /** Begin a new recording, clearing any previous data. */
  startRecording(): void {
    this._frames = []
    this._recording = true
    this._frameCount = 0
  },

  /**
   * Record a single frame of trajectory data.
   * Throttles to every 3rd call (~20 samples/sec at 60fps physics).
   * No-op if not currently recording.
   */
  recordFrame(x: number, y: number, z: number, speed: number, t: number): void {
    if (!this._recording) return
    this._frameCount++
    if (this._frameCount % 3 !== 0) return
    this._frames.push({ x, y, z, speed, t })
  },

  /** Stop recording (keeps data intact for retrieval). */
  stopRecording(): void {
    this._recording = false
  },

  /** Return a copy of the recorded trajectory. */
  getTrajectory(): TrajectoryFrame[] {
    return [...this._frames]
  },

  /** Whether the recorder is currently active. */
  isRecording(): boolean {
    return this._recording
  },

  /** Total recorded frames so far. */
  frameCount(): number {
    return this._frames.length
  },

  /** Discard all recorded data and reset state. */
  clear(): void {
    this._frames = []
    this._recording = false
    this._frameCount = 0
  },
}
