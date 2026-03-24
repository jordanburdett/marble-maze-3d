/**
 * useAudio — React hook that initializes AudioEngine on first user interaction
 * and manages ambient audio lifecycle.
 */

import { useEffect, useCallback, useRef } from 'react'
import { AudioEngine } from '../utils/AudioEngine'

/**
 * Initialize the audio engine on first user interaction.
 * Starts ambient background music when playing, stops when not.
 */
export function useAudio(isPlaying: boolean): void {
  const audioRef = useRef<AudioEngine | null>(null)

  // Initialize on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioRef.current) {
        const engine = AudioEngine.get()
        engine.init()
        audioRef.current = engine
      }
    }

    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  // Manage ambient music based on playing state
  useEffect(() => {
    const engine = AudioEngine.get()
    if (isPlaying) {
      engine.startAmbient()
    } else {
      engine.stopRoll()
    }
  }, [isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const engine = AudioEngine.get()
      engine.stopAll()
    }
  }, [])
}

/**
 * Get audio event callbacks for game events.
 * These callbacks are stable (memoized) and can be called from game logic.
 */
export function useAudioEvents() {
  const playGemCollect = useCallback(() => {
    AudioEngine.get().playGemCollect()
  }, [])

  const playTrapFall = useCallback(() => {
    AudioEngine.get().playTrapFall()
  }, [])

  const playGoalReached = useCallback(() => {
    AudioEngine.get().playGoalReached()
  }, [])

  const playKnock = useCallback((velocity: number) => {
    AudioEngine.get().playKnock(velocity)
  }, [])

  const playRoll = useCallback((speed: number) => {
    AudioEngine.get().playRoll(speed)
  }, [])

  const stopRoll = useCallback(() => {
    AudioEngine.get().stopRoll()
  }, [])

  const playStarAward = useCallback(() => {
    AudioEngine.get().playStarAward()
  }, [])

  return {
    playGemCollect,
    playTrapFall,
    playGoalReached,
    playKnock,
    playRoll,
    stopRoll,
    playStarAward,
  }
}
