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

// Mock AudioContext
const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
  detune: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
}

const mockGain = {
  gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
}

const mockAudioContext = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  sampleRate: 44100,
  createOscillator: vi.fn(() => ({
    ...mockOscillator,
    frequency: { ...mockOscillator.frequency },
  })),
  createGain: vi.fn(() => ({
    ...mockGain,
    gain: { ...mockGain.gain },
  })),
  createBiquadFilter: vi.fn(() => ({
    type: 'lowpass',
    frequency: { value: 1000, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
    Q: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
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

// Mock AudioContext as a proper class constructor
globalThis.AudioContext = vi.fn(function(this: Record<string, unknown>) {
  Object.assign(this, { ...mockAudioContext })
}) as unknown as typeof AudioContext

// Import after mocking
const { MusicEngine, WORLD_SCALES, speedToBPM } = await import('../utils/MusicEngine')
const { AudioEngine } = await import('../utils/AudioEngine')
const { useGameStore } = await import('../store/gameStore')

describe('MusicEngine', () => {
  let engine: ReturnType<typeof MusicEngine.get>

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()

    // Reset singletons
    MusicEngine._resetForTest()
    const existingAudio = AudioEngine.get()
    existingAudio.destroy()

    // Initialize AudioEngine so MusicEngine can access the context
    const audioEngine = AudioEngine.get()
    audioEngine.init()

    engine = MusicEngine.get()

    // Reset store to defaults including musicMode
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
  })

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const a = MusicEngine.get()
      const b = MusicEngine.get()
      expect(a).toBe(b)
    })

    it('should return a new instance after _resetForTest', () => {
      const a = MusicEngine.get()
      MusicEngine._resetForTest()
      const b = MusicEngine.get()
      expect(a).not.toBe(b)
    })
  })

  describe('WORLD_SCALES', () => {
    it('should have scales for worlds 1, 2, and 3', () => {
      expect(WORLD_SCALES[1]).toBeDefined()
      expect(WORLD_SCALES[2]).toBeDefined()
      expect(WORLD_SCALES[3]).toBeDefined()
    })

    it('World 1 should be C major pentatonic (C4, D4, E4, G4, A4)', () => {
      const scale = WORLD_SCALES[1]
      expect(scale).toHaveLength(5)
      expect(scale[0]).toBeCloseTo(261.63, 1) // C4
      expect(scale[1]).toBeCloseTo(293.66, 1) // D4
      expect(scale[2]).toBeCloseTo(329.63, 1) // E4
      expect(scale[3]).toBeCloseTo(392.00, 1) // G4
      expect(scale[4]).toBeCloseTo(440.00, 1) // A4
    })

    it('World 2 should be D minor pentatonic (D4, F4, G4, A4, C5)', () => {
      const scale = WORLD_SCALES[2]
      expect(scale).toHaveLength(5)
      expect(scale[0]).toBeCloseTo(293.66, 1) // D4
      expect(scale[1]).toBeCloseTo(349.23, 1) // F4
      expect(scale[2]).toBeCloseTo(392.00, 1) // G4
      expect(scale[3]).toBeCloseTo(440.00, 1) // A4
      expect(scale[4]).toBeCloseTo(523.25, 1) // C5
    })

    it('World 3 should be A minor pentatonic (A3, C4, D4, E4, G4)', () => {
      const scale = WORLD_SCALES[3]
      expect(scale).toHaveLength(5)
      expect(scale[0]).toBeCloseTo(220.00, 1) // A3
      expect(scale[1]).toBeCloseTo(261.63, 1) // C4
      expect(scale[2]).toBeCloseTo(293.66, 1) // D4
      expect(scale[3]).toBeCloseTo(329.63, 1) // E4
      expect(scale[4]).toBeCloseTo(392.00, 1) // G4
    })

    it('all scales should have exactly 5 notes (pentatonic)', () => {
      expect(WORLD_SCALES[1]).toHaveLength(5)
      expect(WORLD_SCALES[2]).toHaveLength(5)
      expect(WORLD_SCALES[3]).toHaveLength(5)
    })
  })

  describe('speedToBPM', () => {
    it('should map speed 0 to BPM 60', () => {
      expect(speedToBPM(0)).toBe(60)
    })

    it('should map speed 5 to BPM 120', () => {
      expect(speedToBPM(5)).toBe(120)
    })

    it('should map speed 10 to BPM 180', () => {
      expect(speedToBPM(10)).toBe(180)
    })

    it('should clamp negative speeds to 0 (BPM 60)', () => {
      expect(speedToBPM(-5)).toBe(60)
    })

    it('should clamp speeds above 10 to 10 (BPM 180)', () => {
      expect(speedToBPM(15)).toBe(180)
    })

    it('should interpolate linearly between boundaries', () => {
      expect(speedToBPM(2.5)).toBeCloseTo(90, 1)
      expect(speedToBPM(7.5)).toBeCloseTo(150, 1)
    })
  })

  describe('setMarbleSpeed', () => {
    it('should update BPM based on speed', () => {
      engine.setMarbleSpeed(0)
      expect(engine.getCurrentBPM()).toBe(60)

      engine.setMarbleSpeed(5)
      expect(engine.getCurrentBPM()).toBe(120)

      engine.setMarbleSpeed(10)
      expect(engine.getCurrentBPM()).toBe(180)
    })
  })

  describe('getCurrentBPM', () => {
    it('should return default BPM of 60 before any speed update', () => {
      expect(engine.getCurrentBPM()).toBe(60)
    })

    it('should return updated BPM after setMarbleSpeed', () => {
      engine.setMarbleSpeed(7)
      expect(engine.getCurrentBPM()).toBeCloseTo(144, 1)
    })
  })

  describe('isEnabled', () => {
    it('should return false when musicMode is off', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: false,
        },
      })
      expect(engine.isEnabled()).toBe(false)
    })

    it('should return true when musicMode is on', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })
      expect(engine.isEnabled()).toBe(true)
    })
  })

  describe('playMusicalKnock', () => {
    it('should not play when musicMode is off', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: false,
        },
      })
      engine.playMusicalKnock(5, 1)
      // createOscillator should not have been called by MusicEngine
      // (AudioEngine init creates the context, but no oscillators for music)
      const callCountBefore = mockAudioContext.createOscillator.mock.calls.length
      engine.playMusicalKnock(5, 1)
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(callCountBefore)
    })

    it('should play when musicMode is on', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })
      const callCountBefore = mockAudioContext.createOscillator.mock.calls.length
      engine.playMusicalKnock(5, 1)
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(callCountBefore + 1)
    })

    it('should cycle through scale notes sequentially', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      const oscillatorsCreated: { frequency: { value: number } }[] = []
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
        oscillatorsCreated.push(osc)
        return osc
      })

      // Reset note index
      engine.resetNoteIndex()

      // Play 5 notes — should cycle through C4, D4, E4, G4, A4 (World 1)
      const expectedFreqs = WORLD_SCALES[1]
      for (let i = 0; i < 5; i++) {
        engine.playMusicalKnock(5, 1)
      }

      expect(oscillatorsCreated).toHaveLength(5)
      for (let i = 0; i < 5; i++) {
        expect(oscillatorsCreated[i].frequency.value).toBeCloseTo(expectedFreqs[i], 1)
      }
    })

    it('should wrap around to the beginning after cycling through all notes', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      const oscillatorsCreated: { frequency: { value: number } }[] = []
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
        oscillatorsCreated.push(osc)
        return osc
      })

      engine.resetNoteIndex()

      // Play 7 notes — should wrap after 5
      for (let i = 0; i < 7; i++) {
        engine.playMusicalKnock(5, 1)
      }

      expect(oscillatorsCreated).toHaveLength(7)
      // 6th note (index 5) should wrap to index 0
      expect(oscillatorsCreated[5].frequency.value).toBeCloseTo(WORLD_SCALES[1][0], 1)
      // 7th note (index 6) should wrap to index 1
      expect(oscillatorsCreated[6].frequency.value).toBeCloseTo(WORLD_SCALES[1][1], 1)
    })

    it('should use correct scale for each world', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      const oscillatorsCreated: { frequency: { value: number } }[] = []
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
        oscillatorsCreated.push(osc)
        return osc
      })

      engine.resetNoteIndex()

      // Play one note for each world
      engine.playMusicalKnock(5, 1) // World 1 first note = C4
      engine.playMusicalKnock(5, 2) // World 2 second note (index advanced) = F4
      engine.playMusicalKnock(5, 3) // World 3 third note (index advanced) = D4

      expect(oscillatorsCreated[0].frequency.value).toBeCloseTo(WORLD_SCALES[1][0], 1) // C4
      expect(oscillatorsCreated[1].frequency.value).toBeCloseTo(WORLD_SCALES[2][1], 1) // F4 (index 1)
      expect(oscillatorsCreated[2].frequency.value).toBeCloseTo(WORLD_SCALES[3][2], 1) // D4 (index 2)
    })

    it('should use triangle wave oscillator', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      let capturedType: OscillatorType = 'sine'
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
        // Track the type assignment
        const proxy = new Proxy(osc, {
          set(target, prop, value) {
            if (prop === 'type') capturedType = value as OscillatorType
            return Reflect.set(target, prop, value)
          },
        })
        return proxy
      })

      engine.resetNoteIndex()
      engine.playMusicalKnock(5, 1)

      expect(capturedType).toBe('triangle')
    })

    it('should map velocity to volume range 0.2-0.8', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
          sfxVolume: 1.0,
        },
      })

      const gainValues: number[] = []
      mockAudioContext.createGain.mockImplementation(() => {
        const gainObj = {
          gain: {
            value: 1,
            setValueAtTime: vi.fn((val: number) => { gainValues.push(val) }),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            setTargetAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        }
        return gainObj
      })

      engine.resetNoteIndex()

      // Velocity 0 -> volume should be 0.2 * sfxVolume = 0.2
      engine.playMusicalKnock(0, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.2, 1)

      // Velocity 10 -> volume should be 0.8 * sfxVolume = 0.8
      engine.playMusicalKnock(10, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.8, 1)

      // Velocity 5 -> volume should be 0.5 * sfxVolume = 0.5
      engine.playMusicalKnock(5, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.5, 1)
    })

    it('should not play when AudioContext is not available', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      // Destroy audio engine to remove context
      AudioEngine.get().destroy()

      const callCount = mockAudioContext.createOscillator.mock.calls.length
      engine.playMusicalKnock(5, 1)
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(callCount)
    })
  })

  describe('resetNoteIndex', () => {
    it('should reset the note cycle to the beginning', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })

      const oscillatorsCreated: { frequency: { value: number } }[] = []
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
        oscillatorsCreated.push(osc)
        return osc
      })

      // Advance through 3 notes
      engine.resetNoteIndex()
      engine.playMusicalKnock(5, 1) // index 0
      engine.playMusicalKnock(5, 1) // index 1
      engine.playMusicalKnock(5, 1) // index 2

      // Reset and play again — should start from index 0
      engine.resetNoteIndex()
      engine.playMusicalKnock(5, 1) // should be index 0 again

      expect(oscillatorsCreated[3].frequency.value).toBeCloseTo(WORLD_SCALES[1][0], 1)
    })
  })

  describe('toggleMusicMode in store', () => {
    it('should toggle musicMode from false to true', () => {
      const store = useGameStore.getState()
      expect(store.settings.musicMode).toBe(false)
      store.toggleMusicMode()
      expect(useGameStore.getState().settings.musicMode).toBe(true)
    })

    it('should toggle musicMode from true to false', () => {
      useGameStore.setState({
        settings: {
          ...useGameStore.getState().settings,
          musicMode: true,
        },
      })
      useGameStore.getState().toggleMusicMode()
      expect(useGameStore.getState().settings.musicMode).toBe(false)
    })

    it('should persist musicMode to localStorage on toggle', () => {
      localStorageMock.setItem.mockClear()
      useGameStore.getState().toggleMusicMode()
      expect(localStorageMock.setItem).toHaveBeenCalled()

      // Verify the saved value includes musicMode
      const savedCall = localStorageMock.setItem.mock.calls[0]
      const savedData = JSON.parse(savedCall[1])
      expect(savedData.settings.musicMode).toBe(true)
    })
  })
})

describe('AudioEngine.getContext', () => {
  beforeEach(() => {
    const existing = AudioEngine.get()
    existing.destroy()
  })

  afterEach(() => {
    AudioEngine.get().destroy()
  })

  it('should return null before init', () => {
    const engine = AudioEngine.get()
    expect(engine.getContext()).toBeNull()
  })

  it('should return AudioContext after init', () => {
    const engine = AudioEngine.get()
    engine.init()
    expect(engine.getContext()).not.toBeNull()
  })

  it('should return null after destroy', () => {
    const engine = AudioEngine.get()
    engine.init()
    engine.destroy()
    const newEngine = AudioEngine.get()
    expect(newEngine.getContext()).toBeNull()
  })
})
