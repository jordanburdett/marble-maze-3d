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
import { useInput } from '../hooks/useInput'
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

  const isPlaying = gameStatus === GameStatus.Playing
  const { tiltRef, updateTilt } = useInput(isPlaying)
  const [resetTrigger, setResetTrigger] = useState(0)
  const failTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update timer and tilt each frame
  useFrame((state, delta) => {
    if (isPlaying) {
      updateTilt(state.clock.elapsedTime * 1000)
      updateTimer(delta)
    }
  })

  const handleStartMoving = useCallback(() => {
    startTimer()
  }, [startTimer])

  const handleTrapEnter = useCallback(() => {
    if (failTimeoutRef.current) return
    onLevelFail()
    failTimeoutRef.current = setTimeout(() => {
      failTimeoutRef.current = null
      setResetTrigger(prev => prev + 1)
    }, 1000)
  }, [onLevelFail])

  const handleFallOff = useCallback(() => {
    if (failTimeoutRef.current) return
    onLevelFail()
    failTimeoutRef.current = setTimeout(() => {
      failTimeoutRef.current = null
      setResetTrigger(prev => prev + 1)
    }, 1000)
  }, [onLevelFail])

  const handleGoalReach = useCallback(() => {
    onLevelComplete()
  }, [onLevelComplete])

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
      />

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
          onCollect={() => collectGem(i)}
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
