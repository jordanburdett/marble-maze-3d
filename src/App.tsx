import { useCallback, useEffect, useState } from 'react'
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
import { useGameStore, GameMode, GameStatus } from './store/gameStore'
import { getLevel, ALL_LEVELS } from './data/levels'
import {
  generateDailyMaze,
  generateFreePlayMaze,
  hasDailyBeenPlayed,
  markDailyPlayed,
  getTodayKey,
} from './utils/mazeGenerator'
import type { Level } from './data/levels'
import type { MazeSize } from './utils/mazeGenerator'

const Screen = {
  Menu: 'menu',
  CampaignMap: 'campaignMap',
  FreePlaySelect: 'freePlaySelect',
  Playing: 'playing',
  DailyResult: 'dailyResult',
} as const
type Screen = (typeof Screen)[keyof typeof Screen]

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu)
  const [activeLevel, setActiveLevel] = useState<Level | null>(null)

  const gameMode = useGameStore(s => s.gameMode)
  const gameStatus = useGameStore(s => s.gameStatus)
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

  const handleStartDaily = useCallback(() => {
    if (hasDailyBeenPlayed()) {
      // Already played today — still allow viewing
    }
    setGameMode(GameMode.Daily)
    const maze = generateDailyMaze()
    setActiveLevel(maze)
    startLevel(maze.id)
    setScreen(Screen.Playing)
  }, [setGameMode, startLevel])

  const handleStartFreeplay = useCallback(() => {
    setGameMode(GameMode.Freeplay)
    setScreen(Screen.FreePlaySelect)
  }, [setGameMode])

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
    // Auto-reset after 1 second
    setTimeout(() => {
      resetLevel()
    }, 1000)
  }, [failLevel, resetLevel, gameStatus])

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
    setGameMode(GameMode.Menu)
    setActiveLevel(null)
    setScreen(Screen.Menu)
  }, [setGameMode])

  const handleResume = useCallback(() => {
    resumeGame()
  }, [resumeGame])

  // --- Screen rendering ---

  // Menu screen
  if (screen === Screen.Menu || gameMode === GameMode.Menu) {
    return (
      <MenuScreen
        onStartCampaign={handleStartCampaign}
        onStartDaily={handleStartDaily}
        onStartFreeplay={handleStartFreeplay}
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

      {gameStatus === GameStatus.Paused && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRestart}
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
