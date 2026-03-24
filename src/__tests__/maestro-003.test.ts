import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage before importing anything that uses it
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Track all created oscillators/gains/filters
const createdOscillators: Array<{
  type: OscillatorType
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }
  detune: { value: number }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}> = []

const createdGains: Array<{
  gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}> = []

const createdFilters: Array<{
  type: string
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }
  Q: { value: number }
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}> = []

// Mock AudioContext
const mockAudioContext = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  sampleRate: 44100,
  createOscillator: vi.fn(() => {
    const osc = {
      type: 'sine' as OscillatorType,
      frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
      detune: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }
    createdOscillators.push(osc)
    return osc
  }),
  createGain: vi.fn(() => {
    const gain = {
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    createdGains.push(gain)
    return gain
  }),
  createBiquadFilter: vi.fn(() => {
    const filter = {
      type: 'lowpass',
      frequency: { value: 1000, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
      Q: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    createdFilters.push(filter)
    return filter
  }),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(44100 * 0.3)),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  })),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  destination: {},
}

globalThis.AudioContext = vi.fn(function(this: Record<string, unknown>) {
  Object.assign(this, { ...mockAudioContext })
}) as unknown as typeof AudioContext

// Mock matchMedia for reduced motion tests
let mockReducedMotion = false
Object.defineProperty(globalThis, 'window', {
  value: {
    ...globalThis.window,
    matchMedia: vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? mockReducedMotion : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  },
  writable: true,
})

// Import after mocking
const { MusicEngine, AMBIENT_CHORDS } = await import('../utils/MusicEngine')
const { AudioEngine } = await import('../utils/AudioEngine')
const { useGameStore } = await import('../store/gameStore')
const { wallGlowState, WORLD_GLOW_COLORS } = await import('../utils/wallGlowState')
const { prefersReducedMotion } = await import('../hooks/useReducedMotion')

/** Helper to enable music mode */
function enableMusicMode() {
  useGameStore.setState({
    settings: {
      ...useGameStore.getState().settings,
      musicMode: true,
    },
  })
}

/** Helper to disable music mode */
function disableMusicMode() {
  useGameStore.setState({
    settings: {
      ...useGameStore.getState().settings,
      musicMode: false,
      ghostEnabled: true,
    },
  })
}

describe('Maestro-003: Music Mode Toggle, Visual Indicators, Ambient Harmonization', () => {
  let engine: ReturnType<typeof MusicEngine.get>

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
    createdOscillators.length = 0
    createdGains.length = 0
    createdFilters.length = 0
    mockReducedMotion = false

    MusicEngine._resetForTest()
    const existingAudio = AudioEngine.get()
    existingAudio.destroy()

    const audioEngine = AudioEngine.get()
    audioEngine.init()

    engine = MusicEngine.get()

    useGameStore.setState({
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        controlMode: 'keyboard',
        cameraSensitivity: 1.0,
        musicMode: false,
        ghostEnabled: true,
      },
    })

    wallGlowState.reset()
  })

  afterEach(() => {
    MusicEngine._resetForTest()
    AudioEngine.get().destroy()
    vi.useRealTimers()
  })

  // ---- SETTINGS TOGGLE (store level) ----

  describe('Settings toggle changes musicMode in store', () => {
    it('should toggle musicMode from false to true and persist', () => {
      expect(useGameStore.getState().settings.musicMode).toBe(false)
      useGameStore.getState().toggleMusicMode()
      expect(useGameStore.getState().settings.musicMode).toBe(true)
      // Verify persisted
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should toggle musicMode from true to false', () => {
      enableMusicMode()
      useGameStore.getState().toggleMusicMode()
      expect(useGameStore.getState().settings.musicMode).toBe(false)
    })
  })

  // ---- WALL GLOW STATE ----

  describe('Wall glow activates on musical knock and fades', () => {
    it('should trigger glow with correct wall index and world', () => {
      wallGlowState.trigger(5, 2)
      expect(wallGlowState.wallIndex).toBe(5)
      expect(wallGlowState.worldId).toBe(2)
      expect(wallGlowState.intensity).toBe(1.0)
    })

    it('should decay intensity over duration', () => {
      wallGlowState.trigger(3, 1)
      // Simulate half the duration elapsed
      wallGlowState.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - 100
      const intensity = wallGlowState.update()
      expect(intensity).toBeGreaterThan(0)
      expect(intensity).toBeLessThan(1)
    })

    it('should reach zero intensity after full duration', () => {
      wallGlowState.trigger(3, 1)
      // Move time past duration
      wallGlowState.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - 250
      const intensity = wallGlowState.update()
      expect(intensity).toBe(0)
      expect(wallGlowState.wallIndex).toBe(-1)
    })

    it('should return 0 when no glow is active', () => {
      const intensity = wallGlowState.update()
      expect(intensity).toBe(0)
    })

    it('should reset cleanly', () => {
      wallGlowState.trigger(5, 2)
      wallGlowState.reset()
      expect(wallGlowState.wallIndex).toBe(-1)
      expect(wallGlowState.intensity).toBe(0)
    })
  })

  // ---- WORLD GLOW COLORS ----

  describe('World glow colors', () => {
    it('should have warm amber for World 1', () => {
      const [r, g, b] = WORLD_GLOW_COLORS[1]
      expect(r).toBeCloseTo(1.0, 1)
      expect(g).toBeCloseTo(0.702, 1)
      expect(b).toBeCloseTo(0.278, 1)
    })

    it('should have cool cyan for World 2', () => {
      const [r, g, b] = WORLD_GLOW_COLORS[2]
      expect(r).toBeCloseTo(0.0, 1)
      expect(g).toBeCloseTo(0.831, 1)
      expect(b).toBeCloseTo(1.0, 1)
    })

    it('should have gold for World 3', () => {
      const [r, g, b] = WORLD_GLOW_COLORS[3]
      expect(r).toBeCloseTo(1.0, 1)
      expect(g).toBeCloseTo(0.843, 1)
      expect(b).toBeCloseTo(0.0, 1)
    })
  })

  // ---- REDUCED MOTION SKIPS WALL GLOW ----

  describe('Reduced motion skips wall glow animation', () => {
    it('should return true when prefers-reduced-motion is set', () => {
      mockReducedMotion = true
      expect(prefersReducedMotion()).toBe(true)
    })

    it('should return false when prefers-reduced-motion is not set', () => {
      mockReducedMotion = false
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  // ---- AMBIENT CHORD CONSTANTS ----

  describe('AMBIENT_CHORDS', () => {
    it('World 1 should be Cmaj7 (C3-E3-G3-B3)', () => {
      const chord = AMBIENT_CHORDS[1]
      expect(chord).toHaveLength(4)
      expect(chord[0]).toBeCloseTo(130.81, 1) // C3
      expect(chord[1]).toBeCloseTo(164.81, 1) // E3
      expect(chord[2]).toBeCloseTo(196.00, 1) // G3
      expect(chord[3]).toBeCloseTo(246.94, 1) // B3
    })

    it('World 2 should be Dm7 (D3-F3-A3-C4)', () => {
      const chord = AMBIENT_CHORDS[2]
      expect(chord).toHaveLength(4)
      expect(chord[0]).toBeCloseTo(146.83, 1) // D3
      expect(chord[1]).toBeCloseTo(174.61, 1) // F3
      expect(chord[2]).toBeCloseTo(220.00, 1) // A3
      expect(chord[3]).toBeCloseTo(261.63, 1) // C4
    })

    it('World 3 should be Am7 (A2-C3-E3-G3)', () => {
      const chord = AMBIENT_CHORDS[3]
      expect(chord).toHaveLength(4)
      expect(chord[0]).toBeCloseTo(110.00, 1) // A2
      expect(chord[1]).toBeCloseTo(130.81, 1) // C3
      expect(chord[2]).toBeCloseTo(164.81, 1) // E3
      expect(chord[3]).toBeCloseTo(196.00, 1) // G3
    })
  })

  // ---- WORLD-SPECIFIC AMBIENT PAD ----

  describe('World-specific ambient plays correct chord when musicMode on', () => {
    it('should not start ambient pad when musicMode is off', () => {
      disableMusicMode()
      engine.startAmbientPad(1)
      expect(engine.isAmbientPadActive()).toBe(false)
    })

    it('should start ambient pad for World 1 with 4 oscillators', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startAmbientPad(1)
      expect(engine.isAmbientPadActive()).toBe(true)
      expect(createdOscillators.length).toBe(oscCountBefore + 4)
      expect(engine.getAmbientPadWorldId()).toBe(1)
    })

    it('should use correct frequencies for World 1 Cmaj7', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startAmbientPad(1)
      const padOscs = createdOscillators.slice(oscCountBefore)
      expect(padOscs[0].frequency.value).toBeCloseTo(AMBIENT_CHORDS[1][0], 1)
      expect(padOscs[1].frequency.value).toBeCloseTo(AMBIENT_CHORDS[1][1], 1)
      expect(padOscs[2].frequency.value).toBeCloseTo(AMBIENT_CHORDS[1][2], 1)
      expect(padOscs[3].frequency.value).toBeCloseTo(AMBIENT_CHORDS[1][3], 1)
    })

    it('should use correct frequencies for World 2 Dm7', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startAmbientPad(2)
      const padOscs = createdOscillators.slice(oscCountBefore)
      expect(padOscs[0].frequency.value).toBeCloseTo(AMBIENT_CHORDS[2][0], 1)
      expect(padOscs[1].frequency.value).toBeCloseTo(AMBIENT_CHORDS[2][1], 1)
      expect(padOscs[2].frequency.value).toBeCloseTo(AMBIENT_CHORDS[2][2], 1)
      expect(padOscs[3].frequency.value).toBeCloseTo(AMBIENT_CHORDS[2][3], 1)
    })

    it('should use correct frequencies for World 3 Am7', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startAmbientPad(3)
      const padOscs = createdOscillators.slice(oscCountBefore)
      expect(padOscs[0].frequency.value).toBeCloseTo(AMBIENT_CHORDS[3][0], 1)
      expect(padOscs[1].frequency.value).toBeCloseTo(AMBIENT_CHORDS[3][1], 1)
      expect(padOscs[2].frequency.value).toBeCloseTo(AMBIENT_CHORDS[3][2], 1)
      expect(padOscs[3].frequency.value).toBeCloseTo(AMBIENT_CHORDS[3][3], 1)
    })

    it('should be idempotent for same world', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      const oscCount = createdOscillators.length
      engine.startAmbientPad(1) // same world again
      expect(createdOscillators.length).toBe(oscCount)
    })
  })

  // ---- AMBIENT CROSSFADE ON WORLD CHANGE ----

  describe('Ambient crossfade works on world change', () => {
    it('should crossfade to new world chord when world changes', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      expect(engine.getAmbientPadWorldId()).toBe(1)

      const oscCountBefore = createdOscillators.length
      engine.startAmbientPad(2) // switch to world 2
      expect(engine.getAmbientPadWorldId()).toBe(2)
      // Should have created 4 new oscillators for the new pad
      expect(createdOscillators.length).toBe(oscCountBefore + 4)
    })

    it('should fade out old pad gain during crossfade', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      const firstGain = createdGains[createdGains.length - 1]

      engine.startAmbientPad(2) // crossfade
      // The old gain should have been faded out
      expect(firstGain.gain.setTargetAtTime).toHaveBeenCalled()
    })

    it('should clean up old oscillators after crossfade timeout', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      const oldOscs = createdOscillators.slice(-4)

      engine.startAmbientPad(3) // crossfade to world 3

      // After 600ms, old oscillators should be cleaned up
      vi.advanceTimersByTime(700)
      oldOscs.forEach(osc => {
        expect(osc.stop).toHaveBeenCalled()
        expect(osc.disconnect).toHaveBeenCalled()
      })
    })
  })

  // ---- MODE TOGGLE OFF STOPS ALL MUSIC LAYERS ----

  describe('Mode toggle off stops all MusicEngine layers', () => {
    it('stopAllMusicLayers should stop zones and ambient pad', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      engine.startIcePad(1)
      engine.startWindArpeggio(1)
      engine.startRotatingRhythm(2.0)
      engine.startAmbientPad(1)

      expect(engine.isRollDroneActive()).toBe(true)
      expect(engine.isIcePadActive()).toBe(true)
      expect(engine.isWindArpeggioActive()).toBe(true)
      expect(engine.isRotatingRhythmActive()).toBe(true)
      expect(engine.isAmbientPadActive()).toBe(true)

      engine.stopAllMusicLayers()

      expect(engine.isRollDroneActive()).toBe(false)
      expect(engine.isIcePadActive()).toBe(false)
      expect(engine.isWindArpeggioActive()).toBe(false)
      expect(engine.isRotatingRhythmActive()).toBe(false)
      expect(engine.isAmbientPadActive()).toBe(false)
    })

    it('stopAmbientPad should stop pad and mark inactive', () => {
      enableMusicMode()
      engine.startAmbientPad(2)
      expect(engine.isAmbientPadActive()).toBe(true)

      engine.stopAmbientPad()
      expect(engine.isAmbientPadActive()).toBe(false)
    })

    it('stopAmbientPad should disconnect oscillators', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      const padOscs = createdOscillators.slice(-4)

      engine.stopAmbientPad()
      padOscs.forEach(osc => {
        expect(osc.stop).toHaveBeenCalled()
        expect(osc.disconnect).toHaveBeenCalled()
      })
    })

    it('stopAmbientPad should be safe when not active', () => {
      expect(() => engine.stopAmbientPad()).not.toThrow()
    })

    it('_resetForTest should also stop ambient pad', () => {
      enableMusicMode()
      engine.startAmbientPad(1)
      MusicEngine._resetForTest()
      const newEngine = MusicEngine.get()
      expect(newEngine.isAmbientPadActive()).toBe(false)
    })
  })

  // ---- AMBIENT PAD WITHOUT AUDIO CONTEXT ----

  describe('Ambient pad without AudioContext', () => {
    it('should not start ambient pad without context', () => {
      enableMusicMode()
      AudioEngine.get().destroy()
      expect(() => engine.startAmbientPad(1)).not.toThrow()
      expect(engine.isAmbientPadActive()).toBe(false)
    })
  })

  // ---- WALL GLOW DURATION ----

  describe('Wall glow duration is 200ms', () => {
    it('should have a default duration of 200ms', () => {
      expect(wallGlowState.duration).toBe(200)
    })
  })
})
