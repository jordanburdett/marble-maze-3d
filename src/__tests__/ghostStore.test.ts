import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from '../store/gameStore'

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

describe('ghostEnabled setting', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset store settings to defaults
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

  it('should default ghostEnabled to true', () => {
    const state = useGameStore.getState()
    expect(state.settings.ghostEnabled).toBe(true)
  })

  it('should toggle ghostEnabled from true to false', () => {
    useGameStore.getState().toggleGhost()
    expect(useGameStore.getState().settings.ghostEnabled).toBe(false)
  })

  it('should toggle ghostEnabled from false to true', () => {
    useGameStore.getState().toggleGhost()
    expect(useGameStore.getState().settings.ghostEnabled).toBe(false)
    useGameStore.getState().toggleGhost()
    expect(useGameStore.getState().settings.ghostEnabled).toBe(true)
  })

  it('should persist ghostEnabled to localStorage on toggle', () => {
    useGameStore.getState().toggleGhost()
    expect(localStorageMock.setItem).toHaveBeenCalled()
    // Verify the saved data contains ghostEnabled
    const calls = localStorageMock.setItem.mock.calls
    const lastCall = calls[calls.length - 1]
    const parsed = JSON.parse(lastCall[1])
    expect(parsed.settings.ghostEnabled).toBe(false)
  })

  it('should persist ghostEnabled via updateSettings', () => {
    useGameStore.getState().updateSettings({ ghostEnabled: false })
    expect(useGameStore.getState().settings.ghostEnabled).toBe(false)
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should load ghostEnabled from localStorage', () => {
    // Seed localStorage with ghostEnabled: false
    localStorageMock.setItem('marble-maze-3d', JSON.stringify({
      campaignProgress: { levels: {} },
      dailyResults: {},
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        controlMode: 'keyboard',
        cameraSensitivity: 1.0,
        musicMode: false,
        ghostEnabled: false,
      },
    }))
    useGameStore.getState().loadSavedProgress()
    expect(useGameStore.getState().settings.ghostEnabled).toBe(false)
  })

  it('should not affect other settings when toggling ghost', () => {
    useGameStore.getState().updateSettings({ musicVolume: 0.5, sfxVolume: 0.8 })
    useGameStore.getState().toggleGhost()
    const settings = useGameStore.getState().settings
    expect(settings.musicVolume).toBe(0.5)
    expect(settings.sfxVolume).toBe(0.8)
    expect(settings.ghostEnabled).toBe(false)
  })
})
