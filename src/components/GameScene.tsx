import { useRef, useCallback, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { MazeBoard, GoalSensor, TrapSensor } from './MazeBoard'
import { Marble } from './Marble'
import { Gem } from './Gem'
import { MovingWall } from './MovingWall'
import { IcePatch } from './IcePatch'
import { RotatingSegment } from './RotatingSegment'
import { WindZone } from './WindZone'
import { ConnectedParticleSystem } from './Particles'
import { MarbleTrail } from './MarbleTrail'
import { emitGemCollect, emitGoalFountain } from '../utils/particleState'
import { trailPositions } from '../utils/trailState'
import { trajectoryRecorder } from '../utils/trajectoryRecorder'
import { ghostStorage } from '../utils/ghostStorage'
import { cameraState, CameraPhase } from '../utils/cameraState'
import { useInput } from '../hooks/useInput'
import { useAudio, useAudioEvents } from '../hooks/useAudio'
import { AudioEngine } from '../utils/AudioEngine'
import { MusicEngine } from '../utils/MusicEngine'
import { wallGlowState } from '../utils/wallGlowState'
import { useGameStore, GameStatus } from '../store/gameStore'
import type { Level } from '../data/levels'

/** Create gradient texture for background */
function createGradientTexture(topColor: string, bottomColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, topColor)
  gradient.addColorStop(1, bottomColor)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** Background colors per world */
const WORLD_BACKGROUNDS: Record<number, [string, string]> = {
  0: ['#FFF8E7', '#D4C5E2'], // Daily/Freeplay: default cream/lavender
  1: ['#FFF8E7', '#D4C5E2'], // Workshop: cream/lavender
  2: ['#D0E8FF', '#1A3A5C'], // Cavern: light blue/deep blue
  3: ['#FFF8DC', '#8B7514'], // Temple: gold cream/deep gold
}

/** Background gradient + decorative spheres */
function Background({ worldId }: { worldId: number }) {
  const [top, bottom] = WORLD_BACKGROUNDS[worldId] ?? WORLD_BACKGROUNDS[0]
  const texture = useMemo(() => createGradientTexture(top, bottom), [top, bottom])

  useFrame(({ scene }) => {
    if (scene.background !== texture) {
      scene.background = texture
    }
  })

  // Dispose the canvas texture on unmount to free GPU memory
  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  return null
}

/** Large soft-focus decorative spheres in background */
function DecoSpheres() {
  const spheres = useMemo(
    () => [
      { pos: [-6, 3, -8] as [number, number, number], radius: 1.5, color: '#FFD4E5' },
      { pos: [7, 5, -10] as [number, number, number], radius: 2.0, color: '#D4E5FF' },
      { pos: [-3, 7, -12] as [number, number, number], radius: 1.8, color: '#E5FFD4' },
      { pos: [5, 2, -6] as [number, number, number], radius: 1.0, color: '#FFE5D4' },
    ],
    [],
  )

  return (
    <>
      {spheres.map((s, i) => (
        <mesh key={`deco-${i}`} position={s.pos}>
          <sphereGeometry args={[s.radius, 16, 16]} />
          <meshBasicMaterial color={s.color} transparent opacity={0.3} />
        </mesh>
      ))}
    </>
  )
}

/** Ambient + directional lighting (no shadows) */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight
        position={[-3, 5, -3]}
        intensity={0.3}
        color="#ffeedd"
        castShadow={false}
      />
    </>
  )
}

interface GameWorldProps {
  level: Level
  onLevelComplete: () => void
  onLevelFail: () => void
}

function GameWorld({ level, onLevelComplete, onLevelFail }: GameWorldProps) {
  const gameStatus = useGameStore(s => s.gameStatus)
  const gemsCollected = useGameStore(s => s.gemsCollected)
  const collectGem = useGameStore(s => s.collectGem)
  const startTimer = useGameStore(s => s.startTimer)
  const updateTimer = useGameStore(s => s.updateTimer)
  const musicMode = useGameStore(s => s.settings.musicMode)

  const isPlaying = gameStatus === GameStatus.Playing
  const { tiltRef, updateTilt } = useInput(isPlaying)
  const [resetTrigger, setResetTrigger] = useState(0)
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Audio hooks
  useAudio(isPlaying)
  const audio = useAudioEvents()

  // World ID for music engine (clamp to valid range 1-3, default to 1)
  const worldId = (Math.max(1, Math.min(3, level.world)) as 1 | 2 | 3)

  // Number of walls for random glow index selection
  const wallCount = level.walls.length

  // Manage ambient pad based on musicMode + world changes
  useEffect(() => {
    const music = MusicEngine.get()
    if (musicMode && isPlaying) {
      // Start world-specific ambient pad (replaces default ambient)
      AudioEngine.get().stopAmbient()
      music.startAmbientPad(worldId)
    } else if (!musicMode) {
      // Stop music ambient, restart standard ambient
      music.stopAllMusicLayers()
      if (isPlaying) {
        AudioEngine.get().startAmbient()
      }
    }
  }, [musicMode, worldId, isPlaying])

  // Music-aware knock: play musical note when musicMode on, always play SFX knock
  const handleKnock = useCallback((velocity: number) => {
    audio.playKnock(velocity)
    const music = MusicEngine.get()
    music.playMusicalKnock(velocity, worldId)
    // Trigger wall glow if music mode is on
    if (music.isEnabled() && wallCount > 0) {
      const randomWall = Math.floor(Math.random() * wallCount)
      wallGlowState.trigger(randomWall, worldId)
    }
  }, [audio, worldId, wallCount])

  // Music-aware roll: feed speed to MusicEngine for BPM tracking + start/update drone
  const handleRoll = useCallback((speed: number) => {
    audio.playRoll(speed)
    const music = MusicEngine.get()
    music.setMarbleSpeed(speed)
    // startMusicalRoll is idempotent — safe to call every frame
    music.startMusicalRoll(worldId)
    music.updateRollSpeed(speed)
  }, [audio, worldId])

  // Music-aware stop roll: stop bass drone
  const handleStopRoll = useCallback(() => {
    audio.stopRoll()
    MusicEngine.get().stopMusicalRoll()
  }, [audio])

  // Zone enter/leave callbacks for music engine
  const handleEnterIce = useCallback(() => {
    MusicEngine.get().startIcePad(worldId)
  }, [worldId])

  const handleLeaveIce = useCallback(() => {
    MusicEngine.get().stopIcePad()
  }, [])

  const handleEnterWind = useCallback(() => {
    MusicEngine.get().startWindArpeggio(worldId)
  }, [worldId])

  const handleLeaveWind = useCallback(() => {
    MusicEngine.get().stopWindArpeggio()
  }, [])

  const handleEnterRotating = useCallback((speed: number) => {
    MusicEngine.get().startRotatingRhythm(speed)
  }, [])

  const handleLeaveRotating = useCallback(() => {
    MusicEngine.get().stopRotatingRhythm()
  }, [])

  // Update timer and tilt each frame
  useFrame((state, delta) => {
    if (isPlaying) {
      updateTilt(state.clock.elapsedTime * 1000)
      updateTimer(delta)
    }
  })

  // Reset trail, camera, music, and trajectory recording on level reset
  useEffect(() => {
    trailPositions.reset()
    trajectoryRecorder.clear()
    trajectoryRecorder.startRecording()
    cameraState.resetForLevel()
    const music = MusicEngine.get()
    music.resetNoteIndex()
    music.stopAllZones()
    wallGlowState.reset()
  }, [resetTrigger])

  // Reset camera and start recording on initial mount / level change
  useEffect(() => {
    cameraState.resetForLevel()
    trajectoryRecorder.clear()
    trajectoryRecorder.startRecording()
  }, [level.id])

  const handleStartMoving = useCallback(() => {
    startTimer()
  }, [startTimer])

  const handleTrapEnter = useCallback(() => {
    if (failTimeoutRef.current) return
    audio.playTrapFall()
    audio.stopRoll()
    MusicEngine.get().stopAllZones()
    cameraState.setPhase(CameraPhase.TrapZoom)
    trajectoryRecorder.clear()
    onLevelFail()
    failTimeoutRef.current = setTimeout(() => {
      failTimeoutRef.current = null
      setResetTrigger(prev => prev + 1)
    }, 1000)
  }, [onLevelFail, audio])

  const handleFallOff = useCallback(() => {
    if (failTimeoutRef.current) return
    audio.playTrapFall()
    audio.stopRoll()
    MusicEngine.get().stopAllZones()
    cameraState.setPhase(CameraPhase.TrapZoom)
    trajectoryRecorder.clear()
    onLevelFail()
    failTimeoutRef.current = setTimeout(() => {
      failTimeoutRef.current = null
      setResetTrigger(prev => prev + 1)
    }, 1000)
  }, [onLevelFail, audio])

  const handleGoalReach = useCallback(() => {
    audio.playGoalReached()
    audio.stopRoll()
    MusicEngine.get().stopAllZones()
    cameraState.setPhase(CameraPhase.Victory)
    emitGoalFountain(level.goalPosition[0], 0.5, level.goalPosition[1])

    // Save ghost trajectory if ghostEnabled and recording
    trajectoryRecorder.stopRecording()
    const state = useGameStore.getState()
    if (state.settings.ghostEnabled) {
      const trajectory = trajectoryRecorder.getTrajectory()
      if (trajectory.length > 0) {
        ghostStorage.saveGhost(level.id, trajectory, state.timer)
      }
    }

    onLevelComplete()
  }, [onLevelComplete, audio, level.goalPosition, level.id])

  const handleGemCollect = useCallback((index: number) => {
    collectGem(index)
    audio.playGemCollect()
    const gem = level.gems[index]
    if (gem) {
      emitGemCollect(gem[0], 0.6, gem[1], index)
    }
  }, [collectGem, audio, level.gems])

  return (
    <>
      <MazeBoard
        level={level}
        tiltRef={tiltRef}
        enabled={isPlaying}
      />

      <Marble
        startPosition={level.startPosition}
        onFallOff={handleFallOff}
        onStartMoving={handleStartMoving}
        resetTrigger={resetTrigger}
        windZones={level.windZones}
        icePatches={level.icePatches}
        rotatingSegments={level.rotatingSegments}
        onRoll={handleRoll}
        onStopRoll={handleStopRoll}
        onKnock={handleKnock}
        onEnterIce={handleEnterIce}
        onLeaveIce={handleLeaveIce}
        onEnterWind={handleEnterWind}
        onLeaveWind={handleLeaveWind}
        onEnterRotating={handleEnterRotating}
        onLeaveRotating={handleLeaveRotating}
      />

      {/* Marble trail */}
      <MarbleTrail worldId={level.world} />

      {/* Particle system */}
      <ConnectedParticleSystem />

      {/* Goal sensor */}
      <GoalSensor
        position={level.goalPosition}
        onGoalReach={handleGoalReach}
        resetTrigger={resetTrigger}
      />

      {/* Trap sensors */}
      {level.traps.map((trap, i) => (
        <TrapSensor
          key={`trap-sensor-${i}`}
          position={trap}
          onTrapEnter={handleTrapEnter}
        />
      ))}

      {/* Gems */}
      {level.gems.map((gem, i) => (
        <Gem
          key={`gem-${i}`}
          position={gem}
          index={i}
          collected={gemsCollected[i]}
          onCollect={() => handleGemCollect(i)}
        />
      ))}

      {/* Moving walls */}
      {level.movingWalls?.map((mw, i) => (
        <MovingWall key={`mw-${i}`} def={mw} enabled={isPlaying} />
      ))}

      {/* Ice patches (visual only — friction handled in Marble) */}
      {level.icePatches?.map((ip, i) => (
        <IcePatch key={`ice-${i}`} def={ip} />
      ))}

      {/* Rotating segments */}
      {level.rotatingSegments?.map((rs, i) => (
        <RotatingSegment key={`rot-${i}`} def={rs} enabled={isPlaying} />
      ))}

      {/* Wind zones (visual only — force handled in Marble) */}
      {level.windZones?.map((wz, i) => (
        <WindZone key={`wind-${i}`} def={wz} />
      ))}
    </>
  )
}

interface GameSceneProps {
  level: Level
  onLevelComplete: () => void
  onLevelFail: () => void
}

export function GameScene({ level, onLevelComplete, onLevelFail }: GameSceneProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      camera={{
        position: [0, 8, 6],
        fov: 55,
        near: 0.1,
        far: 100,
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <AdaptiveDpr pixelated />
      <Background worldId={level.world} />
      <DecoSpheres />
      <Lights />
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        <GameWorld
          level={level}
          onLevelComplete={onLevelComplete}
          onLevelFail={onLevelFail}
        />
      </Physics>
    </Canvas>
  )
}
