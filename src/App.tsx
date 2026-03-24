import { useCallback, useEffect, useState } from 'react'
import { GameScene } from './components/GameScene'
import {
  MenuScreen,
  LevelSelectScreen,
  GameHUD,
  PauseOverlay,
  LevelCompleteOverlay,
  LevelFailedOverlay,
} from './components/HUD'
import { useGameStore, GameMode, GameStatus } from './store/gameStore'
import { getLevel, WORLD_1_LEVEL_COUNT } from './data/levels'

type Screen = 'menu' | 'levelSelect' | 'playing'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  const gameMode = useGameStore(s => s.gameMode)
  const gameStatus = useGameStore(s => s.gameStatus)
  const currentLevel = useGameStore(s => s.currentLevel)
  const setGameMode = useGameStore(s => s.setGameMode)
  const startLevel = useGameStore(s => s.startLevel)
  const resetLevel = useGameStore(s => s.resetLevel)
  const completeLevel = useGameStore(s => s.completeLevel)
  const failLevel = useGameStore(s => s.failLevel)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const timer = useGameStore(s => s.timer)
  const loadSavedProgress = useGameStore(s => s.loadSavedProgress)

  const level = getLevel(currentLevel)

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

  const handleStartCampaign = useCallback(() => {
    setGameMode(GameMode.Campaign)
    setScreen('levelSelect')
  }, [setGameMode])

  const handleSelectLevel = useCallback((id: number) => {
    startLevel(id)
    setScreen('playing')
  }, [startLevel])

  const handleLevelComplete = useCallback(() => {
    if (gameStatus !== GameStatus.Playing) return
    completeLevel(timer)
  }, [completeLevel, timer, gameStatus])

  const handleLevelFail = useCallback(() => {
    if (gameStatus !== GameStatus.Playing) return
    failLevel()
    // Auto-reset after 1 second (handled in GameScene via resetTrigger)
    setTimeout(() => {
      resetLevel()
    }, 1000)
  }, [failLevel, resetLevel, gameStatus])

  const handleNextLevel = useCallback(() => {
    const nextId = currentLevel + 1
    if (nextId <= WORLD_1_LEVEL_COUNT) {
      startLevel(nextId)
    } else {
      setScreen('levelSelect')
    }
  }, [currentLevel, startLevel])

  const handleRestart = useCallback(() => {
    resetLevel()
  }, [resetLevel])

  const handleBackToMenu = useCallback(() => {
    setGameMode(GameMode.Menu)
    setScreen('menu')
  }, [setGameMode])

  const handleResume = useCallback(() => {
    resumeGame()
  }, [resumeGame])

  // Menu screen
  if (screen === 'menu' || gameMode === GameMode.Menu) {
    return <MenuScreen onStartCampaign={handleStartCampaign} />
  }

  // Level select screen
  if (screen === 'levelSelect') {
    return (
      <LevelSelectScreen
        onSelectLevel={handleSelectLevel}
        onBack={handleBackToMenu}
      />
    )
  }

  // Game screen
  if (!level) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Level not found</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameScene
        level={level}
        onLevelComplete={handleLevelComplete}
        onLevelFail={handleLevelFail}
      />

      <GameHUD level={level} onPause={pauseGame} />

      {gameStatus === GameStatus.Paused && (
        <PauseOverlay
          onResume={handleResume}
          onRestart={handleRestart}
          onMenu={handleBackToMenu}
        />
      )}

      {gameStatus === GameStatus.Complete && (
        <LevelCompleteOverlay
          level={level}
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
