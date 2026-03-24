import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { IcePatchDef } from '../data/levels'

const ICE_COLOR = '#88DDFF'
const SHIMMER_SPEED = 2.0

interface IcePatchProps {
  def: IcePatchDef
}

/**
 * Low-friction floor zone with a shimmer visual.
 * Physics friction is handled by the Marble component detecting overlap.
 * This component is purely visual — the actual friction change is applied
 * by the MazeBoard floor collision detection.
 */
export function IcePatch({ def }: IcePatchProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0.4)

  // Shimmer animation: oscillate opacity
  useFrame(() => {
    if (!meshRef.current) return
    opacityRef.current = 0.3 + 0.15 * Math.sin(Date.now() * 0.003 * SHIMMER_SPEED)
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = opacityRef.current
  })

  // Small diamond pattern overlay for visual interest
  const shimmerTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, 64, 64)

    // Diamond grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i < 8; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 8, 0)
      ctx.lineTo(64, (8 - i) * 8)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * 8)
      ctx.lineTo((8 - i) * 8, 64)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(def.size[0], def.size[1])
    return texture
  }, [def.size])

  return (
    <group position={[def.position[0], 0.008, def.position[1]]}>
      {/* Ice base */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[def.size[0], def.size[1]]} />
        <meshBasicMaterial
          color={ICE_COLOR}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      {/* Diamond shimmer overlay */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
      >
        <planeGeometry args={[def.size[0], def.size[1]]} />
        <meshBasicMaterial
          map={shimmerTexture}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
