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

// Track all created oscillators for type/frequency inspection
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

// Mock matchMedia for reduced motion
let mockReducedMotion = false
Object.defineProperty(globalThis, 'matchMedia', {
  value: vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? mockReducedMotion : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })),
  writable: true,
})

// Import after mocking
const { MusicEngine, WORLD_SCALES, WORLD_ROOT_NOTES } = await import('../utils/MusicEngine')
const { AudioEngine } = await import('../utils/AudioEngine')
const { useGameStore } = await import('../store/gameStore')
const { ghostState } = await import('../utils/ghostState')
const { GHOST_BASE_OPACITY } = await import('../utils/ghostHelpers')
const { prefersReducedMotion } = await import('../hooks/useReducedMotion')

function enableMusic() {
  useGameStore.setState({
    settings: {
      ...useGameStore.getState().settings,
      musicMode: true,
    },
  })
}

describe('ghost-003: Musical Ghost Duets, Settings Toggle, and Final Polish', () => {
  let engine: ReturnType<typeof MusicEngine.get>

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    createdOscillators.length = 0
    createdGains.length = 0
    mockReducedMotion = false

    // Reset singletons
    MusicEngine._resetForTest()
    const existingAudio = AudioEngine.get()
    existingAudio.destroy()

    // Initialize AudioEngine so MusicEngine can access the context
    const audioEngine = AudioEngine.get()
    audioEngine.init()

    engine = MusicEngine.get()

    // Reset store to defaults
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
  })

  afterEach(() => {
    MusicEngine._resetForTest()
    AudioEngine.get().destroy()
  })

  // ========================================
  // 1. playGhostKnock — sine wave
  // ========================================
  describe('playGhostKnock', () => {
    it('should use sine wave oscillator (not triangle)', () => {
      enableMusic()

      let capturedType: OscillatorType = 'triangle'
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

      engine.playGhostKnock(5, 1)
      expect(capturedType).toBe('sine')
    })

    it('should not play when music mode is off', () => {
      // musicMode is off by default
      const oscCountBefore = createdOscillators.length
      engine.playGhostKnock(5, 1)
      expect(createdOscillators.length).toBe(oscCountBefore)
    })

    it('should play when music mode is on', () => {
      enableMusic()
      const oscCountBefore = createdOscillators.length
      engine.playGhostKnock(5, 1)
      expect(createdOscillators.length).toBe(oscCountBefore + 1)
    })

    it('should use note offset +2 from player noteIndex', () => {
      enableMusic()

      engine.resetNoteIndex()
      // Player noteIndex starts at 0; ghost offset is +2
      // So ghost should use scale[2]
      engine.playGhostKnock(5, 1)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_SCALES[1][2], 1) // E4 = 329.63
    })

    it('should wrap ghost note index correctly when near end of scale', () => {
      enableMusic()

      // Advance player noteIndex to 4 (last note)
      engine.resetNoteIndex()
      for (let i = 0; i < 4; i++) {
        engine.playMusicalKnock(5, 1) // advances noteIndex to 4
      }
      // Ghost offset +2 from index 4 = 6 % 5 = 1
      engine.playGhostKnock(5, 1)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_SCALES[1][1], 1) // D4 = 293.66
    })

    it('should map velocity to ghost volume range 0.15-0.5', () => {
      enableMusic()

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
        createdGains.push(gainObj)
        return gainObj
      })

      engine.resetNoteIndex()

      // Velocity 0 -> volume should be 0.15 * sfxVolume = 0.15
      engine.playGhostKnock(0, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.15, 2)

      // Velocity 10 -> volume should be 0.50 * sfxVolume = 0.50
      engine.playGhostKnock(10, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.50, 2)

      // Velocity 5 -> volume should be 0.325 * sfxVolume = 0.325
      engine.playGhostKnock(5, 1)
      expect(gainValues[gainValues.length - 1]).toBeCloseTo(0.325, 2)
    })

    it('should use correct scale for each world', () => {
      enableMusic()
      engine.resetNoteIndex()

      // Ghost offset +2 from index 0 = scale[2]
      engine.playGhostKnock(5, 1)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_SCALES[1][2], 1)

      engine.playGhostKnock(5, 2)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_SCALES[2][2], 1)

      engine.playGhostKnock(5, 3)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_SCALES[3][2], 1)
    })
  })

  // ========================================
  // 2. Ghost roll drone — perfect fifth
  // ========================================
  describe('startGhostRoll', () => {
    it('should start drone at perfect fifth (root * 1.5)', () => {
      enableMusic()

      engine.startGhostRoll(1)
      // World 1 root = C3 = 130.81 Hz; ghost = 130.81 * 1.5 = 196.215 Hz (G3)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      expect(lastOsc.frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[1] * 1.5, 1)
    })

    it('should use sine wave (not sawtooth like player)', () => {
      enableMusic()

      let capturedType: OscillatorType = 'sawtooth'
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

      engine.startGhostRoll(1)
      expect(capturedType).toBe('sine')
    })

    it('should not start when music mode is off', () => {
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(false)
    })

    it('should be idempotent (no double start)', () => {
      enableMusic()
      engine.startGhostRoll(1)
      const oscCount = createdOscillators.length
      engine.startGhostRoll(1) // second call should be no-op
      expect(createdOscillators.length).toBe(oscCount)
    })

    it('should activate ghost drone', () => {
      enableMusic()
      expect(engine.isGhostDroneActive()).toBe(false)
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(true)
    })

    it('should use correct frequency for each world (perfect fifth)', () => {
      enableMusic()

      engine.startGhostRoll(1)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[1] * 1.5, 1) // G3
      engine.stopGhostRoll()

      engine.startGhostRoll(2)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[2] * 1.5, 1) // A3
      engine.stopGhostRoll()

      engine.startGhostRoll(3)
      expect(createdOscillators[createdOscillators.length - 1].frequency.value).toBeCloseTo(WORLD_ROOT_NOTES[3] * 1.5, 1) // E3
      engine.stopGhostRoll()
    })
  })

  // ========================================
  // 3. updateGhostSpeed
  // ========================================
  describe('updateGhostSpeed', () => {
    it('should not update when drone is not active', () => {
      enableMusic()
      // Drone not started — should be safe no-op
      engine.updateGhostSpeed(5)
      // No crash = pass
    })

    it('should update gain when drone is active', () => {
      enableMusic()
      engine.startGhostRoll(1)
      const lastGain = createdGains[createdGains.length - 1]
      engine.updateGhostSpeed(5)
      expect(lastGain.gain.setTargetAtTime).toHaveBeenCalled()
    })
  })

  // ========================================
  // 4. stopGhostRoll
  // ========================================
  describe('stopGhostRoll', () => {
    it('should stop the ghost drone', () => {
      enableMusic()
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(true)
      engine.stopGhostRoll()
      expect(engine.isGhostDroneActive()).toBe(false)
    })

    it('should be safe to call when not active', () => {
      engine.stopGhostRoll()
      expect(engine.isGhostDroneActive()).toBe(false)
    })

    it('should disconnect oscillator and gain', () => {
      enableMusic()
      engine.startGhostRoll(1)
      const lastOsc = createdOscillators[createdOscillators.length - 1]
      const lastGain = createdGains[createdGains.length - 1]
      engine.stopGhostRoll()
      expect(lastOsc.stop).toHaveBeenCalled()
      expect(lastOsc.disconnect).toHaveBeenCalled()
      expect(lastGain.disconnect).toHaveBeenCalled()
    })
  })

  // ========================================
  // 5. Ghost music stops on level end/reset
  // ========================================
  describe('stopAllMusicLayers includes ghost', () => {
    it('should stop ghost drone when stopAllMusicLayers is called', () => {
      enableMusic()
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(true)
      engine.stopAllMusicLayers()
      expect(engine.isGhostDroneActive()).toBe(false)
    })

    it('should stop ghost drone when stopAllGhostMusic is called', () => {
      enableMusic()
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(true)
      engine.stopAllGhostMusic()
      expect(engine.isGhostDroneActive()).toBe(false)
    })
  })

  // ========================================
  // 6. Ghost note offset constant
  // ========================================
  describe('ghostNoteOffset', () => {
    it('should be +2', () => {
      expect(engine.getGhostNoteOffset()).toBe(2)
    })
  })

  // ========================================
  // 7. getNoteIndex (for testing ghost offset)
  // ========================================
  describe('getNoteIndex', () => {
    it('should start at 0', () => {
      engine.resetNoteIndex()
      expect(engine.getNoteIndex()).toBe(0)
    })

    it('should advance after playMusicalKnock', () => {
      enableMusic()
      engine.resetNoteIndex()
      engine.playMusicalKnock(5, 1)
      expect(engine.getNoteIndex()).toBe(1)
    })
  })

  // ========================================
  // 8. Ghost speed computation from trajectory frames
  // ========================================
  describe('ghost speed computation', () => {
    it('should compute speed from position delta / time delta', () => {
      // Test the underlying concept:
      // Given two positions 1 unit apart over 0.5 seconds, speed = 2.0 units/sec
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 1, y: 0, z: 0 }
      const dt = 0.5

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const dz = pos2.z - pos1.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const speed = dist / dt

      expect(speed).toBeCloseTo(2.0, 5)
    })

    it('should compute 3D speed correctly with diagonal movement', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 1, y: 1, z: 1 }
      const dt = 1.0

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const dz = pos2.z - pos1.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const speed = dist / dt

      expect(speed).toBeCloseTo(Math.sqrt(3), 5)
    })

    it('should compute zero speed when position does not change', () => {
      const pos1 = { x: 5, y: 3, z: 7 }
      const pos2 = { x: 5, y: 3, z: 7 }
      const dt = 0.016

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const dz = pos2.z - pos1.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const speed = dist / dt

      expect(speed).toBeCloseTo(0, 5)
    })
  })

  // ========================================
  // 9. Settings toggle ghostEnabled
  // ========================================
  describe('settings toggle ghostEnabled', () => {
    it('should toggle ghostEnabled via toggleGhost', () => {
      const state = useGameStore.getState()
      expect(state.settings.ghostEnabled).toBe(true)
      state.toggleGhost()
      expect(useGameStore.getState().settings.ghostEnabled).toBe(false)
    })

    it('should persist ghostEnabled to localStorage', () => {
      localStorageMock.setItem.mockClear()
      useGameStore.getState().toggleGhost()
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
      const parsed = JSON.parse(lastCall[1])
      expect(parsed.settings.ghostEnabled).toBe(false)
    })
  })

  // ========================================
  // 10. Ghost opacity pulse respects reduced motion
  // ========================================
  describe('opacity pulse with reduced motion', () => {
    it('prefersReducedMotion should check window.matchMedia', () => {
      // In Node test environment (no jsdom), window is undefined so returns false
      // This tests the guard clause works correctly
      const result = prefersReducedMotion()
      expect(typeof result).toBe('boolean')
    })

    it('should return true when matchMedia reports reduced motion', () => {
      // Temporarily define window for this test
      const origWindow = globalThis.window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).window = {
        matchMedia: vi.fn((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      }
      expect(prefersReducedMotion()).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).window = origWindow
    })

    it('should return false when matchMedia reports no preference', () => {
      const origWindow = globalThis.window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).window = {
        matchMedia: vi.fn(() => ({
          matches: false,
          media: '',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      }
      expect(prefersReducedMotion()).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).window = origWindow
    })

    it('should use GHOST_BASE_OPACITY of 0.35', () => {
      expect(GHOST_BASE_OPACITY).toBe(0.35)
    })
  })

  // ========================================
  // 11. Ghost music stops when disabled
  // ========================================
  describe('ghost music stops when ghost disabled', () => {
    it('should not crash when stopping ghost music that was never started', () => {
      engine.stopAllGhostMusic()
      expect(engine.isGhostDroneActive()).toBe(false)
    })

    it('stopAllMusicLayers should stop all layers including ghost', () => {
      enableMusic()
      engine.startMusicalRoll(1)
      engine.startGhostRoll(1)
      expect(engine.isRollDroneActive()).toBe(true)
      expect(engine.isGhostDroneActive()).toBe(true)
      engine.stopAllMusicLayers()
      expect(engine.isRollDroneActive()).toBe(false)
      expect(engine.isGhostDroneActive()).toBe(false)
    })
  })

  // ========================================
  // 12. Ghost state reset
  // ========================================
  describe('ghostState integration', () => {
    it('should reset ghost state on reset()', () => {
      ghostState.active = true
      ghostState.finished = true
      ghostState.opacity = 0.1
      ghostState.reset()
      expect(ghostState.active).toBe(false)
      expect(ghostState.finished).toBe(false)
      expect(ghostState.opacity).toBe(0.35)
    })
  })

  // ========================================
  // 13. _resetForTest includes ghost cleanup
  // ========================================
  describe('_resetForTest', () => {
    it('should clean up ghost music on _resetForTest', () => {
      enableMusic()
      engine.startGhostRoll(1)
      expect(engine.isGhostDroneActive()).toBe(true)
      MusicEngine._resetForTest()
      // After reset, getting a new engine should have inactive ghost drone
      const newEngine = MusicEngine.get()
      expect(newEngine.isGhostDroneActive()).toBe(false)
    })
  })
})
