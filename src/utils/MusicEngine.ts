/**
 * MusicEngine — Transforms the marble maze into a musical instrument.
 * Uses world-specific pentatonic scales for wall collision melodies.
 * Zone-aware harmonic layers: bass drone (roll), ice pads, wind arpeggios, rotating rhythms.
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

// Root notes ONE OCTAVE DOWN for bass drone
// W1: C3, W2: D3, W3: A2
export const WORLD_ROOT_NOTES: Record<1 | 2 | 3, number> = {
  1: 130.81, // C3
  2: 146.83, // D3
  3: 110.00, // A2
}

// Ice pad chords per world (3-note sustained pads)
// W1: C-E-G (Cmaj), W2: D-F-A (Dm), W3: A-C-E (Am)
export const ICE_PAD_CHORDS: Record<1 | 2 | 3, readonly [number, number, number]> = {
  1: [261.63, 329.63, 392.00] as const, // C4, E4, G4
  2: [293.66, 349.23, 440.00] as const, // D4, F4, A4
  3: [220.00, 261.63, 329.63] as const, // A3, C4, E4
}

// World-specific ambient pad chords (4-note 7th chords, one octave lower)
// W1: Cmaj7 (C-E-G-B) — warm
// W2: Dm7 (D-F-A-C) — melancholic, icy
// W3: Am7 (A-C-E-G) — mysterious, ethereal
export const AMBIENT_CHORDS: Record<1 | 2 | 3, readonly [number, number, number, number]> = {
  1: [130.81, 164.81, 196.00, 246.94] as const, // C3, E3, G3, B3 (Cmaj7)
  2: [146.83, 174.61, 220.00, 261.63] as const, // D3, F3, A3, C4 (Dm7)
  3: [110.00, 130.81, 164.81, 196.00] as const, // A2, C3, E3, G3 (Am7)
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

  // Musical roll drone state
  private rollDroneOsc: OscillatorNode | null = null
  private rollDroneGain: GainNode | null = null
  private rollDroneFilter: BiquadFilterNode | null = null
  private rollDroneActive = false

  // Ice pad state
  private icePadOscs: OscillatorNode[] = []
  private icePadGain: GainNode | null = null
  private icePadActive = false

  // Wind arpeggio state
  private windArpTimer: ReturnType<typeof setInterval> | null = null
  private windArpIndex = 0
  private windArpActive = false
  private windArpWorldId: 1 | 2 | 3 = 1

  // Rotating rhythm state
  private rotatingTimer: ReturnType<typeof setInterval> | null = null
  private rotatingActive = false

  // World-specific ambient pad state
  private ambientPadOscs: OscillatorNode[] = []
  private ambientPadGain: GainNode | null = null
  private ambientPadFilter: BiquadFilterNode | null = null
  private ambientPadActive = false
  private ambientPadWorldId: 1 | 2 | 3 = 1
  private ambientSweepTimer: ReturnType<typeof setTimeout> | null = null

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

  /** Get the shared AudioContext, or null if unavailable */
  private getCtx(): AudioContext | null {
    const ctx = AudioEngine.get().getContext()
    if (!ctx) return null
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* ignore */ })
    }
    return ctx
  }

  private get musicVolume(): number {
    return useGameStore.getState().settings.musicVolume
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

  // ---- MUSICAL ROLL DRONE ----

  /**
   * Start a bass drone at the world root note (one octave down).
   * Sawtooth wave with lowpass filter for warm bass tone.
   * Volume and filter cutoff scale with marble velocity via updateRollSpeed.
   */
  startMusicalRoll(worldId: 1 | 2 | 3): void {
    if (!this.isEnabled()) return
    if (this.rollDroneActive) return

    const ctx = this.getCtx()
    if (!ctx) return

    const rootFreq = WORLD_ROOT_NOTES[worldId] ?? WORLD_ROOT_NOTES[1]
    const now = ctx.currentTime

    this.rollDroneOsc = ctx.createOscillator()
    this.rollDroneOsc.type = 'sawtooth'
    this.rollDroneOsc.frequency.value = rootFreq

    this.rollDroneFilter = ctx.createBiquadFilter()
    this.rollDroneFilter.type = 'lowpass'
    this.rollDroneFilter.frequency.value = 200 // start dark
    this.rollDroneFilter.Q.value = 1

    this.rollDroneGain = ctx.createGain()
    this.rollDroneGain.gain.setValueAtTime(0.001, now)
    // Fade in
    this.rollDroneGain.gain.setTargetAtTime(0.08 * this.musicVolume, now, 0.1)

    this.rollDroneOsc.connect(this.rollDroneFilter)
    this.rollDroneFilter.connect(this.rollDroneGain)
    this.rollDroneGain.connect(ctx.destination)
    this.rollDroneOsc.start(now)

    this.rollDroneActive = true
  }

  /**
   * Update the roll drone volume and filter cutoff based on marble speed.
   * Faster = brighter/louder.
   * @param speed — Marble speed (0-10)
   */
  updateRollSpeed(speed: number): void {
    if (!this.rollDroneActive) return

    const ctx = this.getCtx()
    if (!ctx) return

    const clamped = Math.max(0, Math.min(10, speed))
    const normalized = clamped / 10

    // Volume: 0.02 to 0.12 (scaled by musicVolume)
    const volume = (0.02 + normalized * 0.10) * this.musicVolume
    if (this.rollDroneGain) {
      this.rollDroneGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05)
    }

    // Filter cutoff: 200Hz to 1200Hz (brighter when faster)
    if (this.rollDroneFilter) {
      const cutoff = 200 + normalized * 1000
      this.rollDroneFilter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.05)
    }
  }

  /** Stop the musical roll drone */
  stopMusicalRoll(): void {
    if (!this.rollDroneActive) return

    if (this.rollDroneOsc) {
      try { this.rollDroneOsc.stop() } catch { /* already stopped */ }
      this.rollDroneOsc.disconnect()
      this.rollDroneOsc = null
    }
    if (this.rollDroneFilter) {
      this.rollDroneFilter.disconnect()
      this.rollDroneFilter = null
    }
    if (this.rollDroneGain) {
      this.rollDroneGain.disconnect()
      this.rollDroneGain = null
    }
    this.rollDroneActive = false
  }

  /** Check if roll drone is active */
  isRollDroneActive(): boolean {
    return this.rollDroneActive
  }

  // ---- ICE PAD ----

  /**
   * Start a sustained 3-note pad chord when marble enters ice zone.
   * Sine oscillators with slow attack (200ms), sustain while on ice, slow release on stop.
   */
  startIcePad(worldId: 1 | 2 | 3): void {
    if (!this.isEnabled()) return
    if (this.icePadActive) return

    const ctx = this.getCtx()
    if (!ctx) return

    const chord = ICE_PAD_CHORDS[worldId] ?? ICE_PAD_CHORDS[1]
    const now = ctx.currentTime

    this.icePadGain = ctx.createGain()
    this.icePadGain.gain.setValueAtTime(0.001, now)
    // Slow attack: 200ms
    this.icePadGain.gain.linearRampToValueAtTime(0.10 * this.musicVolume, now + 0.2)
    this.icePadGain.connect(ctx.destination)

    this.icePadOscs = chord.map(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(this.icePadGain!)
      osc.start(now)
      return osc
    })

    this.icePadActive = true
  }

  /** Stop the ice pad chord with slow release (500ms fade) */
  stopIcePad(): void {
    if (!this.icePadActive) return

    const ctx = this.getCtx()

    if (this.icePadGain && ctx) {
      const now = ctx.currentTime
      // Slow release: 500ms
      this.icePadGain.gain.setTargetAtTime(0.001, now, 0.15) // ~500ms to reach near-zero
    }

    // Schedule cleanup after release
    const oscs = [...this.icePadOscs]
    const gain = this.icePadGain

    setTimeout(() => {
      oscs.forEach(osc => {
        try { osc.stop() } catch { /* already stopped */ }
        osc.disconnect()
      })
      if (gain) {
        gain.disconnect()
      }
    }, 600)

    this.icePadOscs = []
    this.icePadGain = null
    this.icePadActive = false
  }

  /** Check if ice pad is active */
  isIcePadActive(): boolean {
    return this.icePadActive
  }

  // ---- WIND ARPEGGIO ----

  /**
   * Start an arpeggio cycling through all 5 pentatonic notes.
   * Rate synced to current BPM (one note per beat).
   * Sine oscillator with short decay for each note.
   */
  startWindArpeggio(worldId: 1 | 2 | 3): void {
    if (!this.isEnabled()) return
    if (this.windArpActive) return

    this.windArpIndex = 0
    this.windArpWorldId = worldId
    this.windArpActive = true

    this.scheduleNextArpNote()
  }

  /** Play one arpeggio note and schedule the next */
  private scheduleNextArpNote(): void {
    if (!this.windArpActive) return
    if (!this.isEnabled()) {
      this.windArpActive = false
      return
    }

    const ctx = this.getCtx()
    if (!ctx) return

    const scale = WORLD_SCALES[this.windArpWorldId] ?? WORLD_SCALES[1]
    const freq = scale[this.windArpIndex % scale.length]
    this.windArpIndex = (this.windArpIndex + 1) % scale.length

    const now = ctx.currentTime
    const volume = 0.08 * this.musicVolume

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    // Short decay: note fades over ~200ms
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)

    // Schedule next note at BPM interval
    const intervalMs = (60 / this.currentBPM) * 1000
    this.windArpTimer = setTimeout(() => this.scheduleNextArpNote(), intervalMs)
  }

  /** Stop the wind arpeggio */
  stopWindArpeggio(): void {
    if (!this.windArpActive) return

    if (this.windArpTimer !== null) {
      clearTimeout(this.windArpTimer)
      this.windArpTimer = null
    }
    this.windArpActive = false
    this.windArpIndex = 0
  }

  /** Check if wind arpeggio is active */
  isWindArpeggioActive(): boolean {
    return this.windArpActive
  }

  /** Get current arpeggio note index (for testing) */
  getWindArpIndex(): number {
    return this.windArpIndex
  }

  // ---- ROTATING RHYTHM ----

  /**
   * Play rhythmic kick/pulse sounds synced to rotation speed.
   * Short sine oscillator pitch-drop (200Hz to 50Hz in 50ms) for kick-like sound.
   * @param rotationSpeed — Rotation speed in radians/sec
   */
  startRotatingRhythm(rotationSpeed: number): void {
    if (!this.isEnabled()) return
    if (this.rotatingActive) return

    this.rotatingActive = true

    // Convert rotation speed to pulse interval
    // One kick per quarter rotation (PI/2 radians)
    const absSpeed = Math.abs(rotationSpeed)
    if (absSpeed < 0.1) return // too slow to pulse

    const intervalMs = (Math.PI / 2) / absSpeed * 1000

    this.playKickPulse()
    this.rotatingTimer = setInterval(() => {
      if (this.rotatingActive && this.isEnabled()) {
        this.playKickPulse()
      }
    }, intervalMs)
  }

  /** Play a single kick-like pulse (200Hz -> 50Hz pitch drop in 50ms) */
  private playKickPulse(): void {
    const ctx = this.getCtx()
    if (!ctx) return

    const now = ctx.currentTime
    const volume = 0.10 * this.musicVolume

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  /** Stop the rotating rhythm */
  stopRotatingRhythm(): void {
    if (!this.rotatingActive) return

    if (this.rotatingTimer !== null) {
      clearInterval(this.rotatingTimer)
      this.rotatingTimer = null
    }
    this.rotatingActive = false
  }

  /** Check if rotating rhythm is active */
  isRotatingRhythmActive(): boolean {
    return this.rotatingActive
  }

  // ---- WORLD-SPECIFIC AMBIENT PAD ----

  /**
   * Start a world-specific ambient pad chord.
   * W1: Cmaj7, W2: Dm7, W3: Am7
   * If a pad for a different world is already playing, crossfade over 500ms.
   */
  startAmbientPad(worldId: 1 | 2 | 3): void {
    if (!this.isEnabled()) return

    // If already playing the same world's pad, do nothing
    if (this.ambientPadActive && this.ambientPadWorldId === worldId) return

    // If playing a different world's pad, crossfade
    if (this.ambientPadActive && this.ambientPadWorldId !== worldId) {
      this.crossfadeAmbientPad(worldId)
      return
    }

    const ctx = this.getCtx()
    if (!ctx) return

    this.createAmbientPad(ctx, worldId)
  }

  /** Create new ambient pad oscillators for the given world */
  private createAmbientPad(ctx: AudioContext, worldId: 1 | 2 | 3): void {
    const chord = AMBIENT_CHORDS[worldId] ?? AMBIENT_CHORDS[1]
    const now = ctx.currentTime

    this.ambientPadFilter = ctx.createBiquadFilter()
    this.ambientPadFilter.type = 'lowpass'
    this.ambientPadFilter.frequency.value = 400
    this.ambientPadFilter.Q.value = 0.5

    this.ambientPadGain = ctx.createGain()
    this.ambientPadGain.gain.setValueAtTime(0.001, now)
    // Fade in over ~2 seconds
    this.ambientPadGain.gain.setTargetAtTime(0.06 * this.musicVolume, now, 2.0)

    this.ambientPadFilter.connect(this.ambientPadGain)
    this.ambientPadGain.connect(ctx.destination)

    this.ambientPadOscs = chord.map(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      // Slight detune for warmth
      osc.detune.value = (Math.random() - 0.5) * 6
      osc.connect(this.ambientPadFilter!)
      osc.start(now)
      return osc
    })

    this.ambientPadActive = true
    this.ambientPadWorldId = worldId

    // Start filter sweep cycle
    this.sweepAmbientPadFilter()
  }

  /** Crossfade from current ambient pad to a new world's chord over 500ms */
  private crossfadeAmbientPad(newWorldId: 1 | 2 | 3): void {
    const ctx = this.getCtx()
    if (!ctx) return

    const now = ctx.currentTime

    // Fade out old pad
    if (this.ambientPadGain) {
      this.ambientPadGain.gain.setTargetAtTime(0.001, now, 0.15)
    }

    // Clear old sweep timer
    if (this.ambientSweepTimer !== null) {
      clearTimeout(this.ambientSweepTimer)
      this.ambientSweepTimer = null
    }

    // Schedule cleanup of old oscillators after fade-out
    const oldOscs = [...this.ambientPadOscs]
    const oldGain = this.ambientPadGain
    const oldFilter = this.ambientPadFilter

    setTimeout(() => {
      oldOscs.forEach(osc => {
        try { osc.stop() } catch { /* already stopped */ }
        osc.disconnect()
      })
      if (oldFilter) oldFilter.disconnect()
      if (oldGain) oldGain.disconnect()
    }, 600)

    // Clear refs before creating new pad
    this.ambientPadOscs = []
    this.ambientPadGain = null
    this.ambientPadFilter = null
    this.ambientPadActive = false

    // Create new pad
    this.createAmbientPad(ctx, newWorldId)
  }

  /** Slow filter sweep for ambient pad */
  private sweepAmbientPadFilter(): void {
    const ctx = this.getCtx()
    if (!ctx || !this.ambientPadFilter || !this.ambientPadActive) return

    const now = ctx.currentTime
    const cycleDuration = 8

    this.ambientPadFilter.frequency.setValueAtTime(300, now)
    this.ambientPadFilter.frequency.linearRampToValueAtTime(800, now + cycleDuration / 2)
    this.ambientPadFilter.frequency.linearRampToValueAtTime(300, now + cycleDuration)

    this.ambientSweepTimer = setTimeout(() => this.sweepAmbientPadFilter(), cycleDuration * 1000)
  }

  /** Stop the world-specific ambient pad */
  stopAmbientPad(): void {
    if (!this.ambientPadActive) return

    if (this.ambientSweepTimer !== null) {
      clearTimeout(this.ambientSweepTimer)
      this.ambientSweepTimer = null
    }

    this.ambientPadOscs.forEach(osc => {
      try { osc.stop() } catch { /* already stopped */ }
      osc.disconnect()
    })
    this.ambientPadOscs = []

    if (this.ambientPadFilter) {
      this.ambientPadFilter.disconnect()
      this.ambientPadFilter = null
    }
    if (this.ambientPadGain) {
      this.ambientPadGain.disconnect()
      this.ambientPadGain = null
    }
    this.ambientPadActive = false
  }

  /** Check if ambient pad is active */
  isAmbientPadActive(): boolean {
    return this.ambientPadActive
  }

  /** Get current ambient pad world ID (for testing) */
  getAmbientPadWorldId(): 1 | 2 | 3 {
    return this.ambientPadWorldId
  }

  // ---- CLEANUP ----

  /** Stop all zone music layers */
  stopAllZones(): void {
    this.stopMusicalRoll()
    this.stopIcePad()
    this.stopWindArpeggio()
    this.stopRotatingRhythm()
  }

  /**
   * Stop ALL music engine layers: zones + ambient pad.
   * Used when toggling musicMode off to ensure no dangling oscillators.
   */
  stopAllMusicLayers(): void {
    this.stopAllZones()
    this.stopAmbientPad()
  }

  /** Reset singleton for testing */
  static _resetForTest(): void {
    if (MusicEngine.instance) {
      MusicEngine.instance.stopAllMusicLayers()
    }
    MusicEngine.instance = null
  }
}

export { MusicEngine }
