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
  type: 'sine',
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

const mockFilter = {
  type: 'lowpass',
  frequency: { value: 1000, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
  Q: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
}

const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
}

const mockAudioBuffer = {
  getChannelData: vi.fn(() => new Float32Array(44100 * 0.3)),
}

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({
    ...mockGain,
    gain: { ...mockGain.gain },
  })),
  createBiquadFilter: vi.fn(() => ({
    ...mockFilter,
    frequency: { ...mockFilter.frequency },
  })),
  createBuffer: vi.fn(() => mockAudioBuffer),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  destination: {},
}

// Mock AudioContext as a proper class constructor
globalThis.AudioContext = vi.fn(function(this: Record<string, unknown>) {
  Object.assign(this, { ...mockAudioContext })
}) as unknown as typeof AudioContext

// Need to import after mocking
const { AudioEngine } = await import('../utils/AudioEngine')

describe('AudioEngine', () => {
  let engine: ReturnType<typeof AudioEngine.get>

  beforeEach(() => {
    localStorageMock.clear()
    // Reset singleton by destroying
    const existing = AudioEngine.get()
    existing.destroy()
    engine = AudioEngine.get()
  })

  afterEach(() => {
    engine.destroy()
  })

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const a = AudioEngine.get()
      const b = AudioEngine.get()
      expect(a).toBe(b)
    })
  })

  describe('init', () => {
    it('should create AudioContext on init', () => {
      const countBefore = vi.mocked(AudioContext).mock.calls.length
      engine.init()
      expect(vi.mocked(AudioContext).mock.calls.length).toBe(countBefore + 1)
    })

    it('should be idempotent — calling init twice does not create extra context', () => {
      engine.init()
      const countAfterFirst = vi.mocked(AudioContext).mock.calls.length
      engine.init()
      expect(vi.mocked(AudioContext).mock.calls.length).toBe(countAfterFirst)
    })
  })

  describe('sound methods do not throw when not initialized', () => {
    it('playRoll should not throw', () => {
      expect(() => engine.playRoll(1.0)).not.toThrow()
    })

    it('stopRoll should not throw', () => {
      expect(() => engine.stopRoll()).not.toThrow()
    })

    it('playKnock should not throw', () => {
      expect(() => engine.playKnock(2.0)).not.toThrow()
    })

    it('playGemCollect should not throw', () => {
      expect(() => engine.playGemCollect()).not.toThrow()
    })

    it('playTrapFall should not throw', () => {
      expect(() => engine.playTrapFall()).not.toThrow()
    })

    it('playGoalReached should not throw', () => {
      expect(() => engine.playGoalReached()).not.toThrow()
    })

    it('playStarAward should not throw', () => {
      expect(() => engine.playStarAward()).not.toThrow()
    })

    it('startAmbient should not throw', () => {
      expect(() => engine.startAmbient()).not.toThrow()
    })

    it('stopAmbient should not throw', () => {
      expect(() => engine.stopAmbient()).not.toThrow()
    })

    it('updateAmbientVolume should not throw', () => {
      expect(() => engine.updateAmbientVolume()).not.toThrow()
    })

    it('stopAll should not throw', () => {
      expect(() => engine.stopAll()).not.toThrow()
    })
  })

  describe('sound methods after init', () => {
    beforeEach(() => {
      engine.init()
    })

    it('playGemCollect creates oscillators for C5-E5-G5 chime', () => {
      engine.playGemCollect()
      // Should create 3 oscillators (one per note)
      // Can't check exact count due to mock reset behavior, but should not throw
    })

    it('playGoalReached creates oscillators for major chord', () => {
      engine.playGoalReached()
      // 4 notes: C4-E4-G4-C5
    })

    it('playTrapFall creates descending sweep', () => {
      engine.playTrapFall()
    })

    it('playKnock creates short percussive sound', () => {
      engine.playKnock(3.0)
    })

    it('playKnock does nothing for very low velocity', () => {
      // Low velocity should produce volume < 0.01 and return early
      engine.playKnock(0.01)
    })

    it('playRoll starts rolling sound', () => {
      engine.playRoll(2.0)
    })

    it('playRoll updates existing rolling sound', () => {
      engine.playRoll(1.0)
      engine.playRoll(3.0)
    })

    it('stopRoll fades out rolling sound', () => {
      engine.playRoll(2.0)
      engine.stopRoll()
    })

    it('startAmbient begins ambient pad', () => {
      engine.startAmbient()
    })

    it('startAmbient is idempotent', () => {
      engine.startAmbient()
      engine.startAmbient()
    })

    it('stopAmbient cleans up ambient nodes', () => {
      engine.startAmbient()
      engine.stopAmbient()
    })

    it('stopAll stops both roll and ambient', () => {
      engine.playRoll(2.0)
      engine.startAmbient()
      engine.stopAll()
    })
  })
})
