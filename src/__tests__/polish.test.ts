import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore, ControlMode, GameMode, GameStatus } from '../store/gameStore'
import { joystickInputRef } from '../utils/inputRefs'

// Mock localStorage
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

function resetStore() {
  localStorageMock.clear()
  useGameStore.setState({
    gameMode: GameMode.Menu,
    currentLevel: 1,
    currentWorld: 1,
    gameStatus: GameStatus.Playing,
    timer: 0,
    timerStarted: false,
    gemsCollected: [false, false, false],
    campaignProgress: { levels: {} },
    dailyResults: {},
    settings: {
      musicVolume: 0.7,
      sfxVolume: 1.0,
      controlMode: ControlMode.Keyboard,
      cameraSensitivity: 1.0,
      musicMode: false,
      ghostEnabled: true,
    },
  })
}

describe('ControlMode constants', () => {
  it('should have Keyboard, Mouse, Tilt, Joystick modes', () => {
    expect(ControlMode.Keyboard).toBe('keyboard')
    expect(ControlMode.Mouse).toBe('mouse')
    expect(ControlMode.Tilt).toBe('tilt')
    expect(ControlMode.Joystick).toBe('joystick')
  })
})

describe('updateSettings', () => {
  beforeEach(resetStore)

  it('should update musicVolume', () => {
    useGameStore.getState().updateSettings({ musicVolume: 0.3 })
    expect(useGameStore.getState().settings.musicVolume).toBe(0.3)
  })

  it('should update sfxVolume', () => {
    useGameStore.getState().updateSettings({ sfxVolume: 0.5 })
    expect(useGameStore.getState().settings.sfxVolume).toBe(0.5)
  })

  it('should update controlMode', () => {
    useGameStore.getState().updateSettings({ controlMode: ControlMode.Joystick })
    expect(useGameStore.getState().settings.controlMode).toBe(ControlMode.Joystick)
  })

  it('should update cameraSensitivity', () => {
    useGameStore.getState().updateSettings({ cameraSensitivity: 1.5 })
    expect(useGameStore.getState().settings.cameraSensitivity).toBe(1.5)
  })

  it('should merge partial updates without overwriting other settings', () => {
    useGameStore.getState().updateSettings({ musicVolume: 0.1 })
    useGameStore.getState().updateSettings({ sfxVolume: 0.2 })
    const settings = useGameStore.getState().settings
    expect(settings.musicVolume).toBe(0.1)
    expect(settings.sfxVolume).toBe(0.2)
    expect(settings.controlMode).toBe(ControlMode.Keyboard)
    expect(settings.cameraSensitivity).toBe(1.0)
  })

  it('should persist settings to localStorage', () => {
    useGameStore.getState().updateSettings({ musicVolume: 0.5 })
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should survive round-trip through localStorage', () => {
    useGameStore.getState().updateSettings({
      musicVolume: 0.3,
      sfxVolume: 0.8,
      controlMode: ControlMode.Tilt,
      cameraSensitivity: 1.5,
    })

    // Clear in-memory state
    useGameStore.setState({
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        controlMode: ControlMode.Keyboard,
        cameraSensitivity: 1.0,
        musicMode: false,
        ghostEnabled: true,
      },
    })

    // Reload from storage
    useGameStore.getState().loadSavedProgress()
    const settings = useGameStore.getState().settings
    expect(settings.musicVolume).toBe(0.3)
    expect(settings.sfxVolume).toBe(0.8)
    expect(settings.controlMode).toBe(ControlMode.Tilt)
    expect(settings.cameraSensitivity).toBe(1.5)
  })
})

describe('joystickInputRef', () => {
  it('should have default values of 0/false', () => {
    expect(joystickInputRef.x).toBe(0)
    expect(joystickInputRef.y).toBe(0)
    expect(joystickInputRef.active).toBe(false)
  })

  it('should be mutable', () => {
    joystickInputRef.x = 0.5
    joystickInputRef.y = -0.3
    joystickInputRef.active = true
    expect(joystickInputRef.x).toBe(0.5)
    expect(joystickInputRef.y).toBe(-0.3)
    expect(joystickInputRef.active).toBe(true)

    // Reset
    joystickInputRef.x = 0
    joystickInputRef.y = 0
    joystickInputRef.active = false
  })
})
