/**
 * AudioEngine — Singleton class for all game sound effects and ambient audio.
 * Uses Web Audio API. Creates AudioContext on first user interaction.
 */

import { useGameStore } from '../store/gameStore'

class AudioEngine {
  private static instance: AudioEngine | null = null
  private ctx: AudioContext | null = null
  private initialized = false

  // Rolling sound state
  private rollOsc: OscillatorNode | null = null
  private rollGain: GainNode | null = null
  private rollFilter: BiquadFilterNode | null = null
  private isRolling = false

  // Ambient sound state
  private ambientOscs: OscillatorNode[] = []
  private ambientGain: GainNode | null = null
  private ambientFilter: BiquadFilterNode | null = null
  private ambientStarted = false

  private constructor() {
    // Private — use AudioEngine.get()
  }

  static get(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  /** Initialize AudioContext on first user gesture */
  init(): void {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.initialized = true
    } catch {
      // Web Audio API not available
    }
  }

  /** Ensure audio context is running (browsers suspend until user gesture) */
  private resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore resume failures
      })
    }
  }

  private get sfxVolume(): number {
    return useGameStore.getState().settings.sfxVolume
  }

  private get musicVolume(): number {
    return useGameStore.getState().settings.musicVolume
  }

  // ---- MARBLE ROLLING ----

  /** Start or update rolling sound. Call every frame with marble speed. */
  playRoll(speed: number): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const volume = Math.min(speed / 5, 1) * 0.15 * this.sfxVolume

    if (!this.isRolling) {
      // Create noise-based rolling sound using oscillator with high frequency
      this.rollFilter = this.ctx.createBiquadFilter()
      this.rollFilter.type = 'bandpass'
      this.rollFilter.frequency.value = 200
      this.rollFilter.Q.value = 0.5

      this.rollGain = this.ctx.createGain()
      this.rollGain.gain.value = 0

      // Use a low-frequency sawtooth as base for rumble
      this.rollOsc = this.ctx.createOscillator()
      this.rollOsc.type = 'sawtooth'
      this.rollOsc.frequency.value = 80

      this.rollOsc.connect(this.rollFilter)
      this.rollFilter.connect(this.rollGain)
      this.rollGain.connect(this.ctx.destination)
      this.rollOsc.start()
      this.isRolling = true
    }

    // Update parameters based on speed
    if (this.rollGain) {
      this.rollGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05)
    }
    if (this.rollFilter) {
      const freq = 150 + speed * 80
      this.rollFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05)
    }
    if (this.rollOsc) {
      this.rollOsc.frequency.setTargetAtTime(60 + speed * 20, this.ctx.currentTime, 0.05)
    }
  }

  /** Stop rolling sound */
  stopRoll(): void {
    if (this.rollGain && this.ctx) {
      this.rollGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
    }
    // Don't disconnect — just fade out. Will be cleaned up on next start.
  }

  /** Fully clean up rolling oscillator */
  private cleanupRoll(): void {
    if (this.rollOsc) {
      try { this.rollOsc.stop() } catch { /* already stopped */ }
      this.rollOsc.disconnect()
      this.rollOsc = null
    }
    if (this.rollFilter) {
      this.rollFilter.disconnect()
      this.rollFilter = null
    }
    if (this.rollGain) {
      this.rollGain.disconnect()
      this.rollGain = null
    }
    this.isRolling = false
  }

  // ---- WALL KNOCK ----

  /** Short percussive noise on wall impact. Pitch varies with impact velocity. */
  playKnock(impactVelocity: number): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const vol = Math.min(impactVelocity / 4, 1) * 0.3 * this.sfxVolume
    if (vol < 0.01) return

    const now = this.ctx.currentTime

    const osc = this.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 200 + impactVelocity * 60

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  // ---- GEM COLLECT ----

  /** C5-E5-G5 ascending chime (80ms each, sine, fast decay) */
  playGemCollect(): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const now = this.ctx.currentTime
    const vol = 0.2 * this.sfxVolume
    // C5 = 523.25, E5 = 659.25, G5 = 783.99
    const notes = [523.25, 659.25, 783.99]

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = this.ctx!.createGain()
      const start = now + i * 0.08
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)
      osc.start(start)
      osc.stop(start + 0.2)
    })
  }

  // ---- TRAP HOLE FALL ----

  /** Descending sweep 800 -> 100Hz over 500ms */
  playTrapFall(): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const now = this.ctx.currentTime
    const vol = 0.25 * this.sfxVolume

    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.5)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.55)
  }

  // ---- GOAL REACHED ----

  /** Warm major chord C4-E4-G4-C5 (500ms, triangle wave) */
  playGoalReached(): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const now = this.ctx.currentTime
    const vol = 0.15 * this.sfxVolume
    // C4=261.63, E4=329.63, G4=392.00, C5=523.25
    const notes = [261.63, 329.63, 392.00, 523.25]

    notes.forEach(freq => {
      const osc = this.ctx!.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq

      const gain = this.ctx!.createGain()
      gain.gain.setValueAtTime(vol, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)
      osc.start(now)
      osc.stop(now + 0.55)
    })
  }

  // ---- STAR AWARD ----

  /** High white noise burst with bandpass sweep */
  playStarAward(): void {
    if (!this.ctx || !this.initialized) return
    this.resume()

    const now = this.ctx.currentTime
    const vol = 0.12 * this.sfxVolume

    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.3
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2000, now)
    filter.frequency.exponentialRampToValueAtTime(8000, now + 0.15)
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3)
    filter.Q.value = 2

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)
    noise.start(now)
    noise.stop(now + 0.35)
  }

  // ---- BACKGROUND AMBIENT ----

  /** Cmaj7 pad with slow filter sweep */
  startAmbient(): void {
    if (!this.ctx || !this.initialized || this.ambientStarted) return
    this.resume()

    const now = this.ctx.currentTime
    // Cmaj7: C3=130.81, E3=164.81, G3=196.00, B3=246.94
    const notes = [130.81, 164.81, 196.00, 246.94]

    this.ambientGain = this.ctx.createGain()
    this.ambientGain.gain.value = 0
    // Fade in
    this.ambientGain.gain.setTargetAtTime(
      0.06 * this.musicVolume, now, 2.0,
    )

    this.ambientFilter = this.ctx.createBiquadFilter()
    this.ambientFilter.type = 'lowpass'
    this.ambientFilter.frequency.value = 400
    this.ambientFilter.Q.value = 0.5

    this.ambientFilter.connect(this.ambientGain)
    this.ambientGain.connect(this.ctx.destination)

    this.ambientOscs = notes.map(freq => {
      const osc = this.ctx!.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      // Slight detune for warmth
      osc.detune.value = (Math.random() - 0.5) * 6
      osc.connect(this.ambientFilter!)
      osc.start(now)
      return osc
    })

    this.ambientStarted = true

    // Start filter sweep cycle
    this.sweepAmbientFilter()
  }

  /** Slow filter sweep for ambient pad */
  private sweepAmbientFilter(): void {
    if (!this.ctx || !this.ambientFilter || !this.ambientStarted) return

    const now = this.ctx.currentTime
    const cycleDuration = 8

    this.ambientFilter.frequency.setValueAtTime(300, now)
    this.ambientFilter.frequency.linearRampToValueAtTime(800, now + cycleDuration / 2)
    this.ambientFilter.frequency.linearRampToValueAtTime(300, now + cycleDuration)

    // Schedule next sweep
    setTimeout(() => this.sweepAmbientFilter(), cycleDuration * 1000)
  }

  /** Update ambient volume when music volume changes */
  updateAmbientVolume(): void {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(
        0.06 * this.musicVolume,
        this.ctx.currentTime,
        0.3,
      )
    }
  }

  /** Stop ambient */
  stopAmbient(): void {
    this.ambientOscs.forEach(osc => {
      try { osc.stop() } catch { /* already stopped */ }
      osc.disconnect()
    })
    this.ambientOscs = []
    if (this.ambientFilter) {
      this.ambientFilter.disconnect()
      this.ambientFilter = null
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect()
      this.ambientGain = null
    }
    this.ambientStarted = false
  }

  // ---- CLEANUP ----

  /** Stop all sounds and clean up */
  stopAll(): void {
    this.cleanupRoll()
    this.stopAmbient()
  }

  /** Destroy the audio context entirely */
  destroy(): void {
    this.stopAll()
    if (this.ctx) {
      this.ctx.close().catch(() => {
        // Ignore close failures
      })
      this.ctx = null
    }
    this.initialized = false
  }
}

export { AudioEngine }
