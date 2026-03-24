/**
 * Shared mutable camera state for transitions.
 * Written by game logic, read by the Marble camera controller.
 */

export const CameraPhase = {
  Overview: 'overview',
  Gameplay: 'gameplay',
  TrapZoom: 'trapZoom',
  Victory: 'victory',
} as const
export type CameraPhase = (typeof CameraPhase)[keyof typeof CameraPhase]

export const cameraState = {
  phase: CameraPhase.Overview as CameraPhase,
  /** Elapsed time in the current phase */
  phaseTime: 0,
  /** Duration of the overview-to-gameplay transition */
  overviewDuration: 1.2,
  /** Overview camera Y offset (higher = more pulled back) */
  overviewY: 14,
  /** Overview camera Z offset */
  overviewZ: 10,
  /** Gameplay camera Y */
  gameplayY: 8,
  /** Gameplay camera Z offset from target */
  gameplayZ: 6,
  /** Victory pullback Y */
  victoryY: 12,
  /** Victory pullback Z */
  victoryZ: 9,

  /** Transition to a new phase */
  setPhase(phase: CameraPhase): void {
    this.phase = phase
    this.phaseTime = 0
  },

  /** Advance phase timer */
  tick(dt: number): void {
    this.phaseTime += dt
  },

  /** Reset to overview for new level */
  resetForLevel(): void {
    this.phase = CameraPhase.Overview
    this.phaseTime = 0
  },
}
