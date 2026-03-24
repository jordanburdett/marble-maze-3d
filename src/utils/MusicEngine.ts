/**
 * MusicEngine — Transforms the marble maze into a musical instrument.
 * Uses world-specific pentatonic scales for wall collision melodies.
 * Shares the AudioContext from AudioEngine (never creates a second one).
 */

import { useGameStore } from '../store/gameStore'
import { AudioEngine } from './AudioEngine'

// Note frequencies (Hz) for pentatonic scales per world
// World 1 (Wooden Workshop): C major pentatonic — warm, wooden tones
// World 2 (Crystal Cavern): D minor pentatonic — icy, crystalline
// World 3 (Sky Temple): A minor pentatonic — mysterious, ethereal
export const WORLD_SCALES: Record<1 | 2 | 3, readonly number[]> = {
  1: [261.63, 293.66, 329.63, 392.00, 440.00] as const, // C4, D4, E4, G4, A4
  2: [293.66, 349.23, 392.00, 440.00, 523.25] as const, // D4, F4, G4, A4, C5
  3: [220.00, 261.63, 293.66, 329.63, 392.00] as const, // A3, C4, D4, E4, G4
}

/** Map a marble speed (0-10) to BPM (60-180) linearly */
export function speedToBPM(speed: number): number {
  const clamped = Math.max(0, Math.min(10, speed))
  return 60 + (clamped / 10) * 120
}

class MusicEngine {
  private static instance: MusicEngine | null = null
  private currentBPM = 60
  private noteIndex = 0

  private constructor() {
    // Private — use MusicEngine.get()
  }

  static get(): MusicEngine {
    if (!MusicEngine.instance) {
      MusicEngine.instance = new MusicEngine()
    }
    return MusicEngine.instance
  }

  /** Check if music mode is enabled in the store */
  isEnabled(): boolean {
    return useGameStore.getState().settings.musicMode
  }

  /** Update BPM based on marble speed (0-10 range) */
  setMarbleSpeed(speed: number): void {
    this.currentBPM = speedToBPM(speed)
  }

  /** Get the current BPM */
  getCurrentBPM(): number {
    return this.currentBPM
  }

  /** Reset the note index (e.g., on level restart) */
  resetNoteIndex(): void {
    this.noteIndex = 0
  }

  /**
   * Play a scale-appropriate note on wall collision.
   * Cycles through the world's pentatonic scale sequentially.
   * Uses triangle wave oscillator for warm tone.
   *
   * @param velocity — Impact velocity (affects volume and duration)
   * @param worldId — Which world scale to use (1, 2, or 3)
   */
  playMusicalKnock(velocity: number, worldId: 1 | 2 | 3): void {
    if (!this.isEnabled()) return

    // Get the shared AudioContext from AudioEngine
    const ctx = AudioEngine.get().getContext()
    if (!ctx) return

    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* ignore */ })
    }

    const scale = WORLD_SCALES[worldId] ?? WORLD_SCALES[1]
    const freq = scale[this.noteIndex % scale.length]
    this.noteIndex = (this.noteIndex + 1) % scale.length

    // Map velocity to volume (0.2 - 0.8) and duration (50ms - 200ms)
    const clampedVel = Math.max(0, Math.min(10, velocity))
    const normalizedVel = clampedVel / 10
    const volume = 0.2 + normalizedVel * 0.6
    const duration = 0.05 + normalizedVel * 0.15 // 50ms to 200ms

    const sfxVolume = useGameStore.getState().settings.sfxVolume
    const finalVolume = volume * sfxVolume

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(finalVolume, now)
    // Fast exponential decay envelope
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  /** Reset singleton for testing */
  static _resetForTest(): void {
    MusicEngine.instance = null
  }
}

export { MusicEngine }
