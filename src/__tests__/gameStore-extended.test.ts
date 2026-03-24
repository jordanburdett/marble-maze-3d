import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore, GameMode, GameStatus, ControlMode, calculateStars } from '../store/gameStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    _getStore: () => store,
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

function resetStore() {
  localStorageMock.clear()
  const store = useGameStore.getState()
  store.setGameMode(GameMode.Menu)
  useGameStore.setState({
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
    },
  })
}

describe('calculateStars — boundary and edge cases', () => {
  const thresholds: [number, number, number] = [10, 20, 30]

  it('should give 3 stars for time exactly at the 3-star threshold', () => {
    expect(calculateStars(10, thresholds, false)).toBe(3)
  })

  it('should give 2 stars for time exactly at the 2-star threshold', () => {
    expect(calculateStars(20, thresholds, false)).toBe(2)
  })

  it('should give 1 star for time exactly at the 1-star threshold', () => {
    expect(calculateStars(30, thresholds, false)).toBe(1)
  })

  it('should give 1 star for time beyond the 1-star threshold', () => {
    expect(calculateStars(100, thresholds, false)).toBe(1)
  })

  it('should give 3 stars for zero time', () => {
    expect(calculateStars(0, thresholds, false)).toBe(3)
  })

  it('should give 2 stars for time just over 3-star threshold', () => {
    expect(calculateStars(10.01, thresholds, false)).toBe(2)
  })

  it('should give 1 star for time just over 2-star threshold', () => {
    expect(calculateStars(20.01, thresholds, false)).toBe(1)
  })

  it('should cap bonus star at 3 even with allGems and 2-star time', () => {
    // 2 stars from time + 1 bonus from gems = 3, capped at 3
    expect(calculateStars(15, thresholds, true)).toBe(3)
  })

  it('should not add bonus star when already at 3 stars', () => {
    expect(calculateStars(5, thresholds, true)).toBe(3)
  })

  it('should give 2 stars for 1-star time with all gems collected', () => {
    // 1 star from time + 1 bonus = 2
    expect(calculateStars(25, thresholds, true)).toBe(2)
  })

  it('should give 2 stars for time beyond 1-star threshold with allGems', () => {
    // 1 star from time + 1 bonus = 2
    expect(calculateStars(999, thresholds, true)).toBe(2)
  })
})

describe('gameStore — extended coverage', () => {
  beforeEach(resetStore)

  describe('game mode transitions', () => {
    it('should transition to Daily mode', () => {
      useGameStore.getState().setGameMode(GameMode.Daily)
      expect(useGameStore.getState().gameMode).toBe(GameMode.Daily)
    })

    it('should transition to Freeplay mode', () => {
      useGameStore.getState().setGameMode(GameMode.Freeplay)
      expect(useGameStore.getState().gameMode).toBe(GameMode.Freeplay)
    })

    it('should allow multiple mode transitions in sequence', () => {
      const store = useGameStore.getState()
      store.setGameMode(GameMode.Campaign)
      store.setGameMode(GameMode.Daily)
      store.setGameMode(GameMode.Menu)
      expect(useGameStore.getState().gameMode).toBe(GameMode.Menu)
    })
  })

  describe('resumeGame edge cases', () => {
    it('should not resume from Playing state (already playing)', () => {
      const store = useGameStore.getState()
      // Already playing
      store.resumeGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Playing)
    })

    it('should not resume from Complete state', () => {
      const store = useGameStore.getState()
      store.completeLevel(10)
      store.resumeGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Complete)
    })

    it('should not resume from Failed state', () => {
      const store = useGameStore.getState()
      store.failLevel()
      store.resumeGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Failed)
    })
  })

  describe('timer accumulation', () => {
    it('should accumulate timer from multiple small dt values', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(0.016)
      store.updateTimer(0.016)
      store.updateTimer(0.016)
      expect(useGameStore.getState().timer).toBeCloseTo(0.048)
    })

    it('should not advance timer after completion', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(5.0)
      store.completeLevel(5.0)
      store.updateTimer(5.0)
      expect(useGameStore.getState().timer).toBeCloseTo(5.0)
    })

    it('should not advance timer after failure', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(3.0)
      store.failLevel()
      store.updateTimer(5.0)
      expect(useGameStore.getState().timer).toBeCloseTo(3.0)
    })

    it('should handle zero delta time', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(0)
      expect(useGameStore.getState().timer).toBe(0)
    })
  })

  describe('completeLevel — progress tracking details', () => {
    it('should track gem count in progress', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.collectGem(0)
      store.collectGem(2)
      store.completeLevel(12.0)
      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress.gemsCollected).toBe(2)
    })

    it('should preserve best gem count across replays', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.collectGem(0)
      store.collectGem(1)
      store.collectGem(2)
      store.completeLevel(10.0)

      store.resetLevel()
      store.collectGem(0) // only 1 gem on replay
      store.completeLevel(8.0)

      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress.gemsCollected).toBe(3) // kept best from first run
    })

    it('should preserve best star count across replays', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(5.0) // fast time -> more stars

      const firstStars = useGameStore.getState().campaignProgress.levels['1'].stars

      store.resetLevel()
      store.completeLevel(99.0) // very slow

      const secondStars = useGameStore.getState().campaignProgress.levels['1'].stars
      expect(secondStars).toBeGreaterThanOrEqual(firstStars)
    })

    it('should update best time to lower value on replay', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(20.0)
      store.resetLevel()
      store.completeLevel(10.0)
      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress.bestTime).toBe(10.0)
    })

    it('should not overwrite best time with worse time', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(10.0)
      store.resetLevel()
      store.completeLevel(20.0)
      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress.bestTime).toBe(10.0)
    })

    it('should track progress for multiple different levels independently', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(10.0)
      store.startLevel(2)
      store.completeLevel(20.0)
      store.startLevel(3)
      store.completeLevel(30.0)

      const progress = useGameStore.getState().campaignProgress
      expect(Object.keys(progress.levels)).toHaveLength(3)
      expect(progress.levels['1'].bestTime).toBe(10.0)
      expect(progress.levels['2'].bestTime).toBe(20.0)
      expect(progress.levels['3'].bestTime).toBe(30.0)
    })
  })

  describe('collectGem edge cases', () => {
    it('should be idempotent — collecting the same gem twice keeps it collected', () => {
      const store = useGameStore.getState()
      store.collectGem(0)
      store.collectGem(0)
      expect(useGameStore.getState().gemsCollected).toEqual([true, false, false])
    })

    it('should handle collecting gems in any order', () => {
      const store = useGameStore.getState()
      store.collectGem(2)
      store.collectGem(0)
      store.collectGem(1)
      expect(useGameStore.getState().gemsCollected).toEqual([true, true, true])
    })
  })

  describe('startLevel resets previous game state', () => {
    it('should reset gems when starting a new level after collecting gems', () => {
      const store = useGameStore.getState()
      store.collectGem(0)
      store.collectGem(1)
      store.startLevel(2)
      expect(useGameStore.getState().gemsCollected).toEqual([false, false, false])
    })

    it('should reset timer when starting a new level after timing', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(10.0)
      store.startLevel(2)
      expect(useGameStore.getState().timer).toBe(0)
      expect(useGameStore.getState().timerStarted).toBe(false)
    })

    it('should reset game status to Playing when starting from Failed', () => {
      const store = useGameStore.getState()
      store.failLevel()
      store.startLevel(2)
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Playing)
    })

    it('should reset game status to Playing when starting from Complete', () => {
      const store = useGameStore.getState()
      store.completeLevel(10)
      store.startLevel(2)
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Playing)
    })
  })

  describe('persistence — saveProgress and loadSavedProgress round trip', () => {
    it('should save and load campaign progress correctly', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(12.0)

      // Simulate app restart: clear in-memory state, then load from storage
      useGameStore.setState({
        campaignProgress: { levels: {} },
      })
      expect(useGameStore.getState().campaignProgress.levels['1']).toBeUndefined()

      store.loadSavedProgress()
      expect(useGameStore.getState().campaignProgress.levels['1']).toBeDefined()
      expect(useGameStore.getState().campaignProgress.levels['1'].bestTime).toBe(12.0)
    })

    it('should handle empty localStorage gracefully', () => {
      localStorageMock.clear()
      const store = useGameStore.getState()
      store.loadSavedProgress()
      expect(useGameStore.getState().campaignProgress).toEqual({ levels: {} })
      expect(useGameStore.getState().dailyResults).toEqual({})
    })

    it('should handle malformed localStorage data gracefully', () => {
      localStorageMock.setItem('marble-maze-3d', 'NOT VALID JSON {{{')
      const store = useGameStore.getState()
      store.loadSavedProgress()
      // Should fall back to defaults rather than crashing
      expect(useGameStore.getState().campaignProgress).toEqual({ levels: {} })
    })
  })

  describe('state isolation — actions do not cross-contaminate', () => {
    it('should not change game mode when completing a level', () => {
      const store = useGameStore.getState()
      store.setGameMode(GameMode.Campaign)
      store.startLevel(1)
      store.completeLevel(10.0)
      expect(useGameStore.getState().gameMode).toBe(GameMode.Campaign)
    })

    it('should not change current world when changing levels', () => {
      const store = useGameStore.getState()
      store.startLevel(3)
      expect(useGameStore.getState().currentWorld).toBe(1)
    })
  })
})
