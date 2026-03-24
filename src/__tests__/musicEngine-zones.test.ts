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

// Track all created oscillators for inspection
const createdOscillators: Array<{
  type: OscillatorType
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }
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
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }
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

// Import after mocking
const { MusicEngine, WORLD_SCALES, WORLD_ROOT_NOTES, ICE_PAD_CHORDS } = await import('../utils/MusicEngine')
const { AudioEngine } = await import('../utils/AudioEngine')
const { useGameStore } = await import('../store/gameStore')

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
    },
  })
}

describe('MusicEngine Zone-Based Harmonic Layers', () => {
  let engine: ReturnType<typeof MusicEngine.get>

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
    createdOscillators.length = 0
    createdGains.length = 0
    createdFilters.length = 0

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
      },
    })
  })

  afterEach(() => {
    MusicEngine._resetForTest()
    AudioEngine.get().destroy()
    vi.useRealTimers()
  })

  // ---- WORLD_ROOT_NOTES and ICE_PAD_CHORDS constants ----

  describe('WORLD_ROOT_NOTES', () => {
    it('World 1 root note should be C3 (130.81 Hz)', () => {
      expect(WORLD_ROOT_NOTES[1]).toBeCloseTo(130.81, 1)
    })

    it('World 2 root note should be D3 (146.83 Hz)', () => {
      expect(WORLD_ROOT_NOTES[2]).toBeCloseTo(146.83, 1)
    })

    it('World 3 root note should be A2 (110.00 Hz)', () => {
      expect(WORLD_ROOT_NOTES[3]).toBeCloseTo(110.00, 1)
    })
  })

  describe('ICE_PAD_CHORDS', () => {
    it('World 1 ice chord should be Cmaj (C4-E4-G4)', () => {
      const chord = ICE_PAD_CHORDS[1]
      expect(chord).toHaveLength(3)
      expect(chord[0]).toBeCloseTo(261.63, 1) // C4
      expect(chord[1]).toBeCloseTo(329.63, 1) // E4
      expect(chord[2]).toBeCloseTo(392.00, 1) // G4
    })

    it('World 2 ice chord should be Dm (D4-F4-A4)', () => {
      const chord = ICE_PAD_CHORDS[2]
      expect(chord).toHaveLength(3)
      expect(chord[0]).toBeCloseTo(293.66, 1) // D4
      expect(chord[1]).toBeCloseTo(349.23, 1) // F4
      expect(chord[2]).toBeCloseTo(440.00, 1) // A4
    })

    it('World 3 ice chord should be Am (A3-C4-E4)', () => {
      const chord = ICE_PAD_CHORDS[3]
      expect(chord).toHaveLength(3)
      expect(chord[0]).toBeCloseTo(220.00, 1) // A3
      expect(chord[1]).toBeCloseTo(261.63, 1) // C4
      expect(chord[2]).toBeCloseTo(329.63, 1) // E4
    })
  })

  // ---- MUSICAL ROLL DRONE ----

  describe('startMusicalRoll', () => {
    it('should not start when musicMode is off', () => {
      disableMusicMode()
      engine.startMusicalRoll(1)
      expect(engine.isRollDroneActive()).toBe(false)
    })

    it('should start drone when musicMode is on', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      expect(engine.isRollDroneActive()).toBe(true)
    })

    it('should use correct root note for World 1 (C3)', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)

      // The oscillator is created with default 'sine' type, then set to 'sawtooth'
      // Check the last created oscillator's frequency
      expect(createdOscillators.length).toBeGreaterThanOrEqual(1)
      // The oscillator frequency should match C3
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[1], 1)
    })

    it('should use correct root note for World 2 (D3)', () => {
      enableMusicMode()
      engine.startMusicalRoll(2)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[2], 1)
    })

    it('should use correct root note for World 3 (A2)', () => {
      enableMusicMode()
      engine.startMusicalRoll(3)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[3], 1)
    })

    it('should be idempotent (calling twice does not create duplicate)', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      const oscCountAfterFirst = createdOscillators.length
      engine.startMusicalRoll(1)
      expect(createdOscillators.length).toBe(oscCountAfterFirst)
    })

    it('should create a lowpass filter for warm bass tone', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      expect(createdFilters.length).toBeGreaterThanOrEqual(1)
      const droneFilter = createdFilters[createdFilters.length - 1]
      expect(droneFilter.type).toBe('lowpass')
    })

    it('should use sawtooth wave type', () => {
      enableMusicMode()

      let capturedType: OscillatorType = 'sine'
      mockAudioContext.createOscillator.mockImplementationOnce(() => {
        const osc = {
          type: 'sine' as OscillatorType,
          frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
          detune: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        }
        const proxy = new Proxy(osc, {
          set(target, prop, value) {
            if (prop === 'type') capturedType = value as OscillatorType
            return Reflect.set(target, prop, value)
          },
        })
        createdOscillators.push(osc)
        return proxy
      })

      engine.startMusicalRoll(1)
      expect(capturedType).toBe('sawtooth')
    })
  })

  describe('updateRollSpeed', () => {
    it('should not throw when drone is not active', () => {
      expect(() => engine.updateRollSpeed(5)).not.toThrow()
    })

    it('should update filter cutoff based on speed', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      const filterBefore = createdFilters[createdFilters.length - 1]

      engine.updateRollSpeed(10) // max speed -> cutoff should approach 1200
      expect(filterBefore.frequency.setTargetAtTime).toHaveBeenCalled()
    })

    it('should update gain based on speed', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      const gainNode = createdGains[createdGains.length - 1]

      engine.updateRollSpeed(5)
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalled()
    })
  })

  describe('stopMusicalRoll', () => {
    it('should stop the drone and mark as inactive', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      expect(engine.isRollDroneActive()).toBe(true)

      engine.stopMusicalRoll()
      expect(engine.isRollDroneActive()).toBe(false)
    })

    it('should disconnect oscillator and filter on stop', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      const osc = createdOscillators[createdOscillators.length - 1]
      const filter = createdFilters[createdFilters.length - 1]

      engine.stopMusicalRoll()
      expect(osc.disconnect).toHaveBeenCalled()
      expect(filter.disconnect).toHaveBeenCalled()
    })

    it('should be safe to call when not active', () => {
      expect(() => engine.stopMusicalRoll()).not.toThrow()
    })
  })

  // ---- ICE PAD ----

  describe('startIcePad', () => {
    it('should not start when musicMode is off', () => {
      disableMusicMode()
      engine.startIcePad(1)
      expect(engine.isIcePadActive()).toBe(false)
    })

    it('should start pad when musicMode is on', () => {
      enableMusicMode()
      engine.startIcePad(1)
      expect(engine.isIcePadActive()).toBe(true)
    })

    it('should create 3 oscillators for the chord', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startIcePad(1)
      expect(createdOscillators.length).toBe(oscCountBefore + 3)
    })

    it('should use correct frequencies for World 1 chord (C-E-G)', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startIcePad(1)

      const chordOscs = createdOscillators.slice(oscCountBefore)
      expect(chordOscs[0].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[1][0], 1) // C4
      expect(chordOscs[1].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[1][1], 1) // E4
      expect(chordOscs[2].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[1][2], 1) // G4
    })

    it('should use correct frequencies for World 2 chord (D-F-A)', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startIcePad(2)

      const chordOscs = createdOscillators.slice(oscCountBefore)
      expect(chordOscs[0].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[2][0], 1) // D4
      expect(chordOscs[1].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[2][1], 1) // F4
      expect(chordOscs[2].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[2][2], 1) // A4
    })

    it('should use correct frequencies for World 3 chord (A-C-E)', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startIcePad(3)

      const chordOscs = createdOscillators.slice(oscCountBefore)
      expect(chordOscs[0].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[3][0], 1) // A3
      expect(chordOscs[1].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[3][1], 1) // C4
      expect(chordOscs[2].frequency.value).toBeCloseTo(ICE_PAD_CHORDS[3][2], 1) // E4
    })

    it('should use sine wave oscillators', () => {
      enableMusicMode()

      const capturedTypes: OscillatorType[] = []
      const origImpl = mockAudioContext.createOscillator.getMockImplementation()
      mockAudioContext.createOscillator.mockImplementation(() => {
        const osc = {
          type: 'sine' as OscillatorType,
          frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
          detune: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        }
        const proxy = new Proxy(osc, {
          set(target, prop, value) {
            if (prop === 'type') capturedTypes.push(value as OscillatorType)
            return Reflect.set(target, prop, value)
          },
        })
        createdOscillators.push(osc)
        return proxy
      })

      engine.startIcePad(1)

      // Ice pad uses sine — no type assignment should happen (default is 'sine')
      // or all captured types should be 'sine'
      capturedTypes.forEach(t => expect(t).toBe('sine'))

      // Restore
      if (origImpl) mockAudioContext.createOscillator.mockImplementation(origImpl)
    })

    it('should have slow attack envelope (gain ramps over ~200ms)', () => {
      enableMusicMode()
      engine.startIcePad(1)

      const gainNode = createdGains[createdGains.length - 1]
      // Should have linearRampToValueAtTime called for slow attack
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled()
    })

    it('should be idempotent', () => {
      enableMusicMode()
      engine.startIcePad(1)
      const oscCount = createdOscillators.length
      engine.startIcePad(1) // second call
      expect(createdOscillators.length).toBe(oscCount) // no new oscillators
    })
  })

  describe('stopIcePad', () => {
    it('should mark ice pad as inactive', () => {
      enableMusicMode()
      engine.startIcePad(1)
      expect(engine.isIcePadActive()).toBe(true)

      engine.stopIcePad()
      expect(engine.isIcePadActive()).toBe(false)
    })

    it('should schedule oscillator cleanup after release', () => {
      enableMusicMode()
      engine.startIcePad(1)
      const oscs = createdOscillators.slice(-3)

      engine.stopIcePad()

      // Before timeout: oscillators not yet stopped
      // After 600ms timeout: oscillators should be stopped
      vi.advanceTimersByTime(700)
      oscs.forEach(osc => {
        expect(osc.stop).toHaveBeenCalled()
        expect(osc.disconnect).toHaveBeenCalled()
      })
    })

    it('should be safe to call when not active', () => {
      expect(() => engine.stopIcePad()).not.toThrow()
    })
  })

  // ---- WIND ARPEGGIO ----

  describe('startWindArpeggio', () => {
    it('should not start when musicMode is off', () => {
      disableMusicMode()
      engine.startWindArpeggio(1)
      expect(engine.isWindArpeggioActive()).toBe(false)
    })

    it('should start arpeggio when musicMode is on', () => {
      enableMusicMode()
      engine.startWindArpeggio(1)
      expect(engine.isWindArpeggioActive()).toBe(true)
    })

    it('should play the first note immediately', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startWindArpeggio(1)
      // Should have created at least one oscillator for the first note
      expect(createdOscillators.length).toBe(oscCountBefore + 1)
    })

    it('should cycle through all 5 pentatonic notes', () => {
      enableMusicMode()
      engine.setMarbleSpeed(5) // BPM 120 -> interval 500ms
      const oscCountBefore = createdOscillators.length
      engine.startWindArpeggio(1)

      // First note plays immediately
      expect(createdOscillators.length).toBe(oscCountBefore + 1)
      expect(createdOscillators[oscCountBefore].frequency.value).toBeCloseTo(WORLD_SCALES[1][0], 1)

      // Advance through 4 more notes (500ms each at BPM 120)
      vi.advanceTimersByTime(500)
      expect(createdOscillators[oscCountBefore + 1].frequency.value).toBeCloseTo(WORLD_SCALES[1][1], 1)

      vi.advanceTimersByTime(500)
      expect(createdOscillators[oscCountBefore + 2].frequency.value).toBeCloseTo(WORLD_SCALES[1][2], 1)

      vi.advanceTimersByTime(500)
      expect(createdOscillators[oscCountBefore + 3].frequency.value).toBeCloseTo(WORLD_SCALES[1][3], 1)

      vi.advanceTimersByTime(500)
      expect(createdOscillators[oscCountBefore + 4].frequency.value).toBeCloseTo(WORLD_SCALES[1][4], 1)

      // Verify 5 notes total played
      expect(createdOscillators.length).toBe(oscCountBefore + 5)
    })

    it('should wrap around after all 5 notes', () => {
      enableMusicMode()
      engine.setMarbleSpeed(5) // BPM 120 -> interval 500ms
      const oscCountBefore = createdOscillators.length
      engine.startWindArpeggio(1)

      // Play through 6 notes (wraps to first)
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(500)
      }

      // 6th note should wrap back to scale[0]
      const sixthOsc = createdOscillators[oscCountBefore + 5]
      expect(sixthOsc.frequency.value).toBeCloseTo(WORLD_SCALES[1][0], 1)
    })

    it('should sync rate to current BPM', () => {
      enableMusicMode()

      // At BPM 60, interval is 1000ms
      engine.setMarbleSpeed(0) // BPM 60
      const oscCountBefore = createdOscillators.length
      engine.startWindArpeggio(1)

      // After 500ms: should NOT have played second note yet (interval is 1000ms)
      vi.advanceTimersByTime(500)
      expect(createdOscillators.length).toBe(oscCountBefore + 1) // still just first note

      // After 1000ms total: second note should play
      vi.advanceTimersByTime(500)
      expect(createdOscillators.length).toBe(oscCountBefore + 2)
    })

    it('should use sine oscillator for arpeggio notes', () => {
      enableMusicMode()

      const capturedTypes: OscillatorType[] = []
      mockAudioContext.createOscillator.mockImplementation(() => {
        const osc = {
          type: 'sine' as OscillatorType,
          frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
          detune: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        }
        const proxy = new Proxy(osc, {
          set(target, prop, value) {
            if (prop === 'type') capturedTypes.push(value as OscillatorType)
            return Reflect.set(target, prop, value)
          },
        })
        createdOscillators.push(osc)
        return proxy
      })

      engine.startWindArpeggio(1)
      // Sine is the default, no type reassignment expected (or explicitly sine)
      capturedTypes.forEach(t => expect(t).toBe('sine'))
    })

    it('should be idempotent', () => {
      enableMusicMode()
      engine.startWindArpeggio(1)
      const oscCount = createdOscillators.length
      engine.startWindArpeggio(1)
      // No additional oscillators should be created (second call is no-op)
      expect(createdOscillators.length).toBe(oscCount)
    })
  })

  describe('stopWindArpeggio', () => {
    it('should stop the arpeggio and mark as inactive', () => {
      enableMusicMode()
      engine.startWindArpeggio(1)
      expect(engine.isWindArpeggioActive()).toBe(true)

      engine.stopWindArpeggio()
      expect(engine.isWindArpeggioActive()).toBe(false)
    })

    it('should stop scheduling new notes', () => {
      enableMusicMode()
      engine.setMarbleSpeed(5) // BPM 120 -> 500ms interval
      engine.startWindArpeggio(1)
      const oscCountAfterStart = createdOscillators.length

      engine.stopWindArpeggio()

      // Advance timers — no new notes should play
      vi.advanceTimersByTime(2000)
      expect(createdOscillators.length).toBe(oscCountAfterStart)
    })

    it('should reset arp index', () => {
      enableMusicMode()
      engine.startWindArpeggio(1)
      vi.advanceTimersByTime(1000) // advance a few notes

      engine.stopWindArpeggio()
      expect(engine.getWindArpIndex()).toBe(0)
    })

    it('should be safe to call when not active', () => {
      expect(() => engine.stopWindArpeggio()).not.toThrow()
    })
  })

  // ---- ROTATING RHYTHM ----

  describe('startRotatingRhythm', () => {
    it('should not start when musicMode is off', () => {
      disableMusicMode()
      engine.startRotatingRhythm(2.0)
      expect(engine.isRotatingRhythmActive()).toBe(false)
    })

    it('should start rhythm when musicMode is on', () => {
      enableMusicMode()
      engine.startRotatingRhythm(2.0)
      expect(engine.isRotatingRhythmActive()).toBe(true)
    })

    it('should play first kick immediately', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startRotatingRhythm(2.0)
      // Should have created at least one oscillator for the kick
      expect(createdOscillators.length).toBeGreaterThan(oscCountBefore)
    })

    it('should use pitch-drop (200Hz to 50Hz) for kick sound', () => {
      enableMusicMode()
      engine.startRotatingRhythm(2.0)

      const kickOsc = createdOscillators[createdOscillators.length - 1]
      // Should have setValueAtTime(200, ...) and exponentialRampToValueAtTime(50, ...)
      expect(kickOsc.frequency.setValueAtTime).toHaveBeenCalledWith(200, expect.any(Number))
      expect(kickOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(50, expect.any(Number))
    })

    it('should sync pulse rate to rotation speed', () => {
      enableMusicMode()

      // rotation speed = PI rad/s -> one quarter rotation = PI/2 / PI * 1000 = 500ms
      engine.startRotatingRhythm(Math.PI)
      const oscCountAfterStart = createdOscillators.length

      // After 500ms, should trigger another kick
      vi.advanceTimersByTime(500)
      expect(createdOscillators.length).toBeGreaterThan(oscCountAfterStart)
    })

    it('should not start for very slow rotation (< 0.1 rad/s)', () => {
      enableMusicMode()
      const oscCountBefore = createdOscillators.length
      engine.startRotatingRhythm(0.05)
      // Should set active but the guard inside returns early
      expect(createdOscillators.length).toBe(oscCountBefore)
    })

    it('should be idempotent', () => {
      enableMusicMode()
      engine.startRotatingRhythm(2.0)
      const oscCount = createdOscillators.length
      engine.startRotatingRhythm(2.0) // second call
      expect(createdOscillators.length).toBe(oscCount) // no new kick
    })
  })

  describe('stopRotatingRhythm', () => {
    it('should stop rhythm and mark as inactive', () => {
      enableMusicMode()
      engine.startRotatingRhythm(2.0)
      expect(engine.isRotatingRhythmActive()).toBe(true)

      engine.stopRotatingRhythm()
      expect(engine.isRotatingRhythmActive()).toBe(false)
    })

    it('should stop scheduling new kicks', () => {
      enableMusicMode()
      engine.startRotatingRhythm(Math.PI) // ~500ms interval
      const oscCountAfterStart = createdOscillators.length

      engine.stopRotatingRhythm()

      // Advance timers — no new kicks
      vi.advanceTimersByTime(2000)
      expect(createdOscillators.length).toBe(oscCountAfterStart)
    })

    it('should be safe to call when not active', () => {
      expect(() => engine.stopRotatingRhythm()).not.toThrow()
    })
  })

  // ---- MUSIC MODE TOGGLE RESPECT ----

  describe('musicMode toggle respect', () => {
    it('all zone layers should not start when musicMode is off', () => {
      disableMusicMode()

      engine.startMusicalRoll(1)
      engine.startIcePad(1)
      engine.startWindArpeggio(1)
      engine.startRotatingRhythm(2.0)

      expect(engine.isRollDroneActive()).toBe(false)
      expect(engine.isIcePadActive()).toBe(false)
      expect(engine.isWindArpeggioActive()).toBe(false)
      expect(engine.isRotatingRhythmActive()).toBe(false)
    })

    it('all zone layers should start when musicMode is on', () => {
      enableMusicMode()

      engine.startMusicalRoll(1)
      engine.startIcePad(1)
      engine.startWindArpeggio(1)
      engine.startRotatingRhythm(2.0)

      expect(engine.isRollDroneActive()).toBe(true)
      expect(engine.isIcePadActive()).toBe(true)
      expect(engine.isWindArpeggioActive()).toBe(true)
      expect(engine.isRotatingRhythmActive()).toBe(true)
    })
  })

  // ---- STOP ALL ZONES ----

  describe('stopAllZones', () => {
    it('should stop all active zone layers', () => {
      enableMusicMode()

      engine.startMusicalRoll(1)
      engine.startIcePad(1)
      engine.startWindArpeggio(1)
      engine.startRotatingRhythm(2.0)

      engine.stopAllZones()

      expect(engine.isRollDroneActive()).toBe(false)
      expect(engine.isIcePadActive()).toBe(false)
      expect(engine.isWindArpeggioActive()).toBe(false)
      expect(engine.isRotatingRhythmActive()).toBe(false)
    })

    it('should be safe to call when no zones are active', () => {
      expect(() => engine.stopAllZones()).not.toThrow()
    })
  })

  // ---- CLEANUP ON _resetForTest ----

  describe('_resetForTest cleanup', () => {
    it('should stop all zones before resetting', () => {
      enableMusicMode()
      engine.startMusicalRoll(1)
      engine.startIcePad(1)
      engine.startWindArpeggio(1)
      engine.startRotatingRhythm(2.0)

      MusicEngine._resetForTest()

      // After reset, getting a new instance should start clean
      const newEngine = MusicEngine.get()
      expect(newEngine.isRollDroneActive()).toBe(false)
      expect(newEngine.isIcePadActive()).toBe(false)
      expect(newEngine.isWindArpeggioActive()).toBe(false)
      expect(newEngine.isRotatingRhythmActive()).toBe(false)
    })
  })

  // ---- NO CONTEXT AVAILABLE ----

  describe('methods without AudioContext', () => {
    it('startMusicalRoll should not throw without AudioContext', () => {
      enableMusicMode()
      AudioEngine.get().destroy()
      expect(() => engine.startMusicalRoll(1)).not.toThrow()
      expect(engine.isRollDroneActive()).toBe(false)
    })

    it('startIcePad should not throw without AudioContext', () => {
      enableMusicMode()
      AudioEngine.get().destroy()
      expect(() => engine.startIcePad(1)).not.toThrow()
      expect(engine.isIcePadActive()).toBe(false)
    })

    it('startWindArpeggio should not throw without AudioContext', () => {
      enableMusicMode()
      AudioEngine.get().destroy()
      expect(() => engine.startWindArpeggio(1)).not.toThrow()
      // Wind arpeggio may set active=true but the first note fails gracefully
    })

    it('startRotatingRhythm should not throw without AudioContext', () => {
      enableMusicMode()
      AudioEngine.get().destroy()
      expect(() => engine.startRotatingRhythm(2.0)).not.toThrow()
    })
  })
})
