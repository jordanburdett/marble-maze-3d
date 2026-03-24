import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore, GameMode, GameStatus, calculateStars } from '../store/gameStore'

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

describe('gameStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store to initial state
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
    })
  })

  describe('initial state', () => {
    it('should start in menu mode', () => {
      const state = useGameStore.getState()
      expect(state.gameMode).toBe(GameMode.Menu)
    })

    it('should have default game status as playing', () => {
      const state = useGameStore.getState()
      expect(state.gameStatus).toBe(GameStatus.Playing)
    })

    it('should start with no gems collected', () => {
      const state = useGameStore.getState()
      expect(state.gemsCollected).toEqual([false, false, false])
    })

    it('should have timer at 0 and not started', () => {
      const state = useGameStore.getState()
      expect(state.timer).toBe(0)
      expect(state.timerStarted).toBe(false)
    })
  })

  describe('startLevel', () => {
    it('should set the current level and reset state', () => {
      const store = useGameStore.getState()
      store.startLevel(3)
      const state = useGameStore.getState()
      expect(state.currentLevel).toBe(3)
      expect(state.gameStatus).toBe(GameStatus.Playing)
      expect(state.timer).toBe(0)
      expect(state.timerStarted).toBe(false)
      expect(state.gemsCollected).toEqual([false, false, false])
    })
  })

  describe('resetLevel', () => {
    it('should reset timer and gems but keep the current level', () => {
      const store = useGameStore.getState()
      store.startLevel(2)
      store.startTimer()
      store.updateTimer(5.0)
      store.collectGem(0)
      store.resetLevel()
      const state = useGameStore.getState()
      expect(state.currentLevel).toBe(2)
      expect(state.timer).toBe(0)
      expect(state.timerStarted).toBe(false)
      expect(state.gemsCollected).toEqual([false, false, false])
    })
  })

  describe('collectGem', () => {
    it('should mark a specific gem as collected', () => {
      const store = useGameStore.getState()
      store.collectGem(1)
      expect(useGameStore.getState().gemsCollected).toEqual([false, true, false])
    })

    it('should allow collecting all three gems', () => {
      const store = useGameStore.getState()
      store.collectGem(0)
      store.collectGem(1)
      store.collectGem(2)
      expect(useGameStore.getState().gemsCollected).toEqual([true, true, true])
    })
  })

  describe('timer', () => {
    it('should not advance timer if not started', () => {
      const store = useGameStore.getState()
      store.updateTimer(1.0)
      expect(useGameStore.getState().timer).toBe(0)
    })

    it('should advance timer when started and playing', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(1.5)
      expect(useGameStore.getState().timer).toBeCloseTo(1.5)
    })

    it('should not advance timer when paused', () => {
      const store = useGameStore.getState()
      store.startTimer()
      store.updateTimer(1.0)
      store.pauseGame()
      store.updateTimer(1.0)
      expect(useGameStore.getState().timer).toBeCloseTo(1.0)
    })
  })

  describe('pause/resume', () => {
    it('should pause from playing state', () => {
      const store = useGameStore.getState()
      store.pauseGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Paused)
    })

    it('should resume from paused state', () => {
      const store = useGameStore.getState()
      store.pauseGame()
      store.resumeGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Playing)
    })

    it('should not pause when not playing', () => {
      const store = useGameStore.getState()
      store.failLevel()
      store.pauseGame()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Failed)
    })
  })

  describe('completeLevel', () => {
    it('should set status to complete', () => {
      const store = useGameStore.getState()
      store.completeLevel(10.0)
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Complete)
    })

    it('should save progress to campaign', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(10.0)
      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress).toBeDefined()
      expect(progress.bestTime).toBe(10.0)
    })

    it('should keep best time on replay', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(8.0)
      store.resetLevel()
      store.completeLevel(12.0)
      const progress = useGameStore.getState().campaignProgress.levels['1']
      expect(progress.bestTime).toBe(8.0)
    })

    it('should persist to localStorage', () => {
      const store = useGameStore.getState()
      store.startLevel(1)
      store.completeLevel(10.0)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('failLevel', () => {
    it('should set status to failed', () => {
      const store = useGameStore.getState()
      store.failLevel()
      expect(useGameStore.getState().gameStatus).toBe(GameStatus.Failed)
    })
  })

  describe('setGameMode', () => {
    it('should change game mode', () => {
      const store = useGameStore.getState()
      store.setGameMode(GameMode.Campaign)
      expect(useGameStore.getState().gameMode).toBe(GameMode.Campaign)
    })
  })
})

describe('calculateStars', () => {
  const thresholds: [number, number, number] = [10, 20, 30]

  it('should give 3 stars for fast completion', () => {
    expect(calculateStars(8, thresholds, false)).toBe(3)
  })

  it('should give 2 stars for medium time', () => {
    expect(calculateStars(15, thresholds, false)).toBe(2)
  })

  it('should give 1 star for slow completion', () => {
    expect(calculateStars(25, thresholds, false)).toBe(1)
  })

  it('should give bonus star for all gems collected', () => {
    expect(calculateStars(25, thresholds, true)).toBe(2)
  })

  it('should cap at 3 stars even with all gems and fast time', () => {
    expect(calculateStars(5, thresholds, true)).toBe(3)
  })
})
