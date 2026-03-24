import { useCallback, useEffect, useRef, useState } from 'react'
import { GameScene } from './components/GameScene'
import {
  MenuScreen,
  GameHUD,
  PauseOverlay,
  LevelCompleteOverlay,
  LevelFailedOverlay,
  FreePlaySelect,
} from './components/HUD'
import { CampaignMap } from './components/CampaignMap'
import { DailyResult } from './components/DailyResult'
import { SettingsScreen } from './components/SettingsScreen'
import { VirtualJoystick } from './components/VirtualJoystick'
import { TiltController } from './components/TiltController'
import { useGameStore, GameMode, GameStatus, ControlMode } from './store/gameStore'
import { getLevel, ALL_LEVELS } from './data/levels'
import {
  generateDailyMaze,
  generateFreePlayMaze,
  hasDailyBeenPlayed,
  markDailyPlayed,
  getTodayKey,
} from './utils/mazeGenerator'
import { isMobileDevice } from './hooks/useTiltControls'
import { AudioEngine } from './utils/AudioEngine'
import { joystickInputRef } from './utils/inputRefs'
import type { Level } from './data/levels'
import type { MazeSize } from './utils/mazeGenerator'

const Screen = {
  Menu: 'menu',
  CampaignMap: 'campaignMap',
  FreePlaySelect: 'freePlaySelect',
  Playing: 'playing',
  DailyResult: 'dailyResult',
  Settings: 'settings',
} as const
type Screen = (typeof Screen)[keyof typeof Screen]

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu)
  const [activeLevel, setActiveLevel] = useState<Level | null>(null)
  const prevScreenRef = useRef<Screen>(Screen.Menu)
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gameMode = useGameStore(s => s.gameMode)
  const gameStatus = useGameStore(s => s.gameStatus)
  const controlMode = useGameStore(s => s.settings.controlMode)
  const setGameMode = useGameStore(s => s.setGameMode)
  const startLevel = useGameStore(s => s.startLevel)
  const resetLevel = useGameStore(s => s.resetLevel)
  const completeLevel = useGameStore(s => s.completeLevel)
  const failLevel = useGameStore(s => s.failLevel)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const timer = useGameStore(s => s.timer)
  const gemsCollected = useGameStore(s => s.gemsCollected)
  const saveDailyResult = useGameStore(s => s.saveDailyResult)
  const loadSavedProgress = useGameStore(s => s.loadSavedProgress)

  // Track the daily result for display
  const [dailyGemCount, setDailyGemCount] = useState(0)
  const [dailyTime, setDailyTime] = useState(0)

  const mobile = isMobileDevice()

  // Load saved progress on mount
  useEffect(() => {
    loadSavedProgress()
  }, [loadSavedProgress])

  // Escape key to pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameStatus === GameStatus.Playing) {
          pauseGame()
        } else if (gameStatus === GameStatus.Paused) {
          resumeGame()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameStatus, pauseGame, resumeGame])

  // --- Navigation handlers ---

  const handleStartCampaign = useCallback(() => {
    setGameMode(GameMode.Campaign)
    setScreen(Screen.CampaignMap)
  }, [setGameMode])

  const dailyResults = useGameStore(s => s.dailyResults)

  const handleStartDaily = useCallback(() => {
    if (hasDailyBeenPlayed()) {
      // Already played today — show saved result instead of replaying
      const todayKey = getTodayKey()
      const saved = dailyResults[todayKey]
      if (saved) {
        setDailyGemCount(saved.gemsCollected)
        setDailyTime(saved.time)
      }
      setScreen(Screen.DailyResult)
      return
    }
    setGameMode(GameMode.Daily)
    const maze = generateDailyMaze()
    setActiveLevel(maze)
    startLevel(maze.id)
    setScreen(Screen.Playing)
  }, [setGameMode, startLevel, dailyResults])

  const handleStartFreeplay = useCallback(() => {
    setGameMode(GameMode.Freeplay)
    setScreen(Screen.FreePlaySelect)
  }, [setGameMode])

  const handleOpenSettings = useCallback(() => {
    prevScreenRef.current = screen
    setScreen(Screen.Settings)
  }, [screen])

  const handleCloseSettings = useCallback(() => {
    setScreen(prevScreenRef.current)
  }, [])

  const handleSelectCampaignLevel = useCallback((id: number) => {
    const level = getLevel(id)
    if (level) {
      setActiveLevel(level)
      startLevel(id)
      setScreen(Screen.Playing)
    }
  }, [startLevel])

  const handleFreeplayLevel = useCallback((id: number) => {
    const level = getLevel(id)
    if (level) {
      setActiveLevel(level)
      startLevel(id)
      setScreen(Screen.Playing)
    }
  }, [startLevel])

  const handleFreeplayRandom = useCallback((size: MazeSize) => {
    const maze = generateFreePlayMaze(size)
    setActiveLevel(maze)
    startLevel(maze.id)
    setScreen(Screen.Playing)
  }, [startLevel])

  const handleLevelComplete = useCallback(() => {
    if (gameStatus !== GameStatus.Playing || !activeLevel) return

    // Play star award sound
    AudioEngine.get().playStarAward()

    if (gameMode === GameMode.Daily) {
      // Save daily result
      const gemCount = gemsCollected.filter(Boolean).length
      setDailyGemCount(gemCount)
      setDailyTime(timer)
      saveDailyResult(getTodayKey(), {
        time: timer,
        stars: 0,
        gemsCollected: gemCount,
      })
      markDailyPlayed()
      completeLevel(timer, activeLevel.starThresholds)
      setScreen(Screen.DailyResult)
    } else {
      completeLevel(timer, activeLevel.starThresholds)
    }
  }, [completeLevel, timer, gameStatus, activeLevel, gameMode, gemsCollected, saveDailyResult])

  const handleLevelFail = useCallback(() => {
    if (gameStatus !== GameStatus.Playing) return
    failLevel()
    // Auto-reset after 1 second — store timeout ID for cleanup
    failTimeoutRef.current = setTimeout(() => {
      failTimeoutRef.current = null
      resetLevel()
    }, 1000)
  }, [failLevel, resetLevel, gameStatus])

  // Clean up fail timeout on unmount
  useEffect(() => {
    return () => {
      if (failTimeoutRef.current !== null) {
        clearTimeout(failTimeoutRef.current)
        failTimeoutRef.current = null
      }
    }
  }, [])

  const handleNextLevel = useCallback(() => {
    if (!activeLevel) return
    const nextId = activeLevel.id + 1
    const nextLevel = ALL_LEVELS.find(l => l.id === nextId)
    if (nextLevel) {
      setActiveLevel(nextLevel)
      startLevel(nextId)
    } else {
      setScreen(Screen.CampaignMap)
    }
  }, [activeLevel, startLevel])

  const handleRestart = useCallback(() => {
    resetLevel()
  }, [resetLevel])

  const handleBackToMenu = useCallback(() => {
    if (failTimeoutRef.current !== null) {
      clearTimeout(failTimeoutRef.current)
      failTimeoutRef.current = null
    }
    setGameMode(GameMode.Menu)
    setActiveLevel(null)
    setScreen(Screen.Menu)
    AudioEngine.get().stopAll()
  }, [setGameMode])

  const handleResume = useCallback(() => {
    resumeGame()
  }, [resumeGame])

  // Joystick handlers
  const handleJoystickMove = useCallback((x: number, y: number) => {
    joystickInputRef.x = x
    joystickInputRef.y = y
    joystickInputRef.active = true
  }, [])

  const handleJoystickRelease = useCallback(() => {
    joystickInputRef.x = 0
    joystickInputRef.y = 0
    joystickInputRef.active = false
  }, [])

  // Pause menu with settings navigation
  const handlePauseSettings = useCallback(() => {
    prevScreenRef.current = Screen.Playing
    setScreen(Screen.Settings)
  }, [])

  // --- Screen rendering ---

  // Settings screen
  if (screen === Screen.Settings) {
    return (
      <SettingsScreen onBack={handleCloseSettings} />
    )
  }

  // Menu screen
  if (screen === Screen.Menu || gameMode === GameMode.Menu) {
    return (
      <MenuScreen
        onStartCampaign={handleStartCampaign}
        onStartDaily={handleStartDaily}
        onStartFreeplay={handleStartFreeplay}
        onSettings={handleOpenSettings}
      />
    )
  }

  // Campaign map
  if (screen === Screen.CampaignMap) {
    return (
      <CampaignMap
        onSelectLevel={handleSelectCampaignLevel}
        onBack={handleBackToMenu}
      />
    )
  }

  // Free play select
  if (screen === Screen.FreePlaySelect) {
    return (
      <FreePlaySelect
        onSelectCampaignLevel={handleFreeplayLevel}
        onGenerateRandom={handleFreeplayRandom}
        onBack={handleBackToMenu}
      />
    )
  }

  // Daily result screen
  if (screen === Screen.DailyResult) {
    return (
      <DailyResult
        time={dailyTime}
        gemsCollected={dailyGemCount}
        onMenu={handleBackToMenu}
      />
    )
  }

  // Game screen
  if (!activeLevel) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Level not found</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameScene
        level={activeLevel}
        onLevelComplete={handleLevelComplete}
        onLevelFail={handleLevelFail}
      />

      <GameHUD level={activeLevel} onPause={pauseGame} />

      {/* Virtual joystick for mobile */}
      {mobile && controlMode === ControlMode.Joystick && gameStatus === GameStatus.Playing && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
        />
      )}

      {/* Tilt controls for mobile */}
      {mobile && controlMode === ControlMode.Tilt && (
        <TiltController enabled={gameStatus === GameStatus.Playing} />
      )}

      {gameStatus === GameStatus.Paused && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRestart}
          onSettings={handlePauseSettings}
          onMenu={handleBackToMenu}
        />
      )}

      {gameStatus === GameStatus.Complete && gameMode !== GameMode.Daily && (
        <LevelCompleteOverlay
          level={activeLevel}
          onNextLevel={handleNextLevel}
          onRestart={handleRestart}
          onMenu={handleBackToMenu}
        />
      )}

      {gameStatus === GameStatus.Failed && (
        <LevelFailedOverlay
          onRestart={handleRestart}
          onMenu={handleBackToMenu}
        />
      )}
    </div>
  )
}
