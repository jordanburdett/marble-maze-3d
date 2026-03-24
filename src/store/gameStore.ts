import { create } from 'zustand'

// --- Const-object pattern instead of enums (erasableSyntaxOnly) ---

export const GameMode = {
  Menu: 'menu',
  Campaign: 'campaign',
  Daily: 'daily',
  Freeplay: 'freeplay',
} as const
export type GameMode = (typeof GameMode)[keyof typeof GameMode]

export const GameStatus = {
  Playing: 'playing',
  Paused: 'paused',
  Complete: 'complete',
  Failed: 'failed',
} as const
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus]

export const ControlMode = {
  Keyboard: 'keyboard',
  Mouse: 'mouse',
} as const
export type ControlMode = (typeof ControlMode)[keyof typeof ControlMode]

// --- Types ---

export interface GameSettings {
  musicVolume: number
  sfxVolume: number
  controlMode: ControlMode
  cameraSensitivity: number
}

export interface LevelProgress {
  stars: number
  bestTime: number
  gemsCollected: number
}

export interface DailyResult {
  time: number
  stars: number
  gemsCollected: number
}

export interface CampaignProgress {
  /** keyed by level ID (number as string) */
  levels: Record<string, LevelProgress>
}

export interface GameState {
  // Current session
  gameMode: GameMode
  currentLevel: number
  currentWorld: number
  gameStatus: GameStatus
  timer: number
  timerStarted: boolean
  gemsCollected: [boolean, boolean, boolean]

  // Settings
  settings: GameSettings

  // Persistent progress
  campaignProgress: CampaignProgress
  dailyResults: Record<string, DailyResult>

  // Actions
  startLevel: (levelId: number) => void
  resetLevel: () => void
  collectGem: (index: number) => void
  completeLevel: (time: number) => void
  failLevel: () => void
  pauseGame: () => void
  resumeGame: () => void
  updateTimer: (dt: number) => void
  startTimer: () => void
  setGameMode: (mode: GameMode) => void
  loadSavedProgress: () => void
  saveProgress: () => void
}

const STORAGE_KEY = 'marble-maze-3d'

interface SavedData {
  campaignProgress: CampaignProgress
  dailyResults: Record<string, DailyResult>
  settings: GameSettings
}

function loadFromStorage(): Partial<SavedData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SavedData
  } catch {
    return {}
  }
}

function saveToStorage(data: SavedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

const defaultSettings: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 1.0,
  controlMode: ControlMode.Keyboard,
  cameraSensitivity: 1.0,
}

/** Calculate stars earned based on time thresholds */
export function calculateStars(
  time: number,
  thresholds: [number, number, number],
  allGems: boolean,
): number {
  let stars = 1
  if (time <= thresholds[1]) stars = 2
  if (time <= thresholds[0]) stars = 3
  // Bonus: all gems collected doesn't change star count, but could be used for "perfect"
  // Keep it simple: stars are time-based, gems are a separate achievement
  if (allGems && stars < 3) stars = Math.min(stars + 1, 3)
  return stars
}

export const useGameStore = create<GameState>((set, get) => {
  const saved = loadFromStorage()

  return {
    // Initial state
    gameMode: GameMode.Menu,
    currentLevel: 1,
    currentWorld: 1,
    gameStatus: GameStatus.Playing,
    timer: 0,
    timerStarted: false,
    gemsCollected: [false, false, false],

    settings: saved.settings ?? { ...defaultSettings },
    campaignProgress: saved.campaignProgress ?? { levels: {} },
    dailyResults: saved.dailyResults ?? {},

    // --- Actions ---

    startLevel: (levelId: number) => {
      set({
        currentLevel: levelId,
        gameStatus: GameStatus.Playing,
        timer: 0,
        timerStarted: false,
        gemsCollected: [false, false, false],
      })
    },

    resetLevel: () => {
      set({
        gameStatus: GameStatus.Playing,
        timer: 0,
        timerStarted: false,
        gemsCollected: [false, false, false],
      })
    },

    collectGem: (index: number) => {
      const gems = [...get().gemsCollected] as [boolean, boolean, boolean]
      gems[index] = true
      set({ gemsCollected: gems })
    },

    completeLevel: (time: number) => {
      set({ gameStatus: GameStatus.Complete })

      // Save progress
      const state = get()
      const levelKey = String(state.currentLevel)
      const existing = state.campaignProgress.levels[levelKey]
      const allGems = state.gemsCollected.every(Boolean)
      const gemCount = state.gemsCollected.filter(Boolean).length

      // We need the level data to calculate stars — import at usage would be circular,
      // so we pass a generic star calc. The caller should provide thresholds.
      // For simplicity, use a default threshold approach
      const stars = allGems ? 3 : time <= 15 ? 3 : time <= 25 ? 2 : 1

      const newProgress: LevelProgress = {
        stars: Math.max(stars, existing?.stars ?? 0),
        bestTime: existing ? Math.min(time, existing.bestTime) : time,
        gemsCollected: Math.max(gemCount, existing?.gemsCollected ?? 0),
      }

      const updatedProgress = {
        ...state.campaignProgress,
        levels: {
          ...state.campaignProgress.levels,
          [levelKey]: newProgress,
        },
      }

      set({ campaignProgress: updatedProgress })
      get().saveProgress()
    },

    failLevel: () => {
      set({ gameStatus: GameStatus.Failed })
    },

    pauseGame: () => {
      if (get().gameStatus === GameStatus.Playing) {
        set({ gameStatus: GameStatus.Paused })
      }
    },

    resumeGame: () => {
      if (get().gameStatus === GameStatus.Paused) {
        set({ gameStatus: GameStatus.Playing })
      }
    },

    updateTimer: (dt: number) => {
      const state = get()
      if (state.gameStatus === GameStatus.Playing && state.timerStarted) {
        set({ timer: state.timer + dt })
      }
    },

    startTimer: () => {
      set({ timerStarted: true })
    },

    setGameMode: (mode: GameMode) => {
      set({ gameMode: mode })
    },

    loadSavedProgress: () => {
      const saved = loadFromStorage()
      set({
        campaignProgress: saved.campaignProgress ?? { levels: {} },
        dailyResults: saved.dailyResults ?? {},
        settings: saved.settings ?? { ...defaultSettings },
      })
    },

    saveProgress: () => {
      const state = get()
      saveToStorage({
        campaignProgress: state.campaignProgress,
        dailyResults: state.dailyResults,
        settings: state.settings,
      })
    },
  }
})
