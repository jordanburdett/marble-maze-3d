import { describe, it, expect, vi, beforeEach } from 'vitest'

// =============================================================================
// 1. Tilt calibration math tests
// =============================================================================
describe('Tilt calibration math', () => {
  const MAX_TILT_DEGREES = 20
  const MAX_TILT_ANGLE = (12 * Math.PI) / 180

  /** Simulate the tilt normalization logic from useTiltControls */
  function computeTilt(
    beta: number,
    gamma: number,
    calBeta: number,
    calGamma: number,
  ): { tiltX: number; tiltZ: number } {
    const dBeta = beta - calBeta
    const dGamma = gamma - calGamma
    const normalizedX = Math.max(-1, Math.min(1, dBeta / MAX_TILT_DEGREES))
    const normalizedZ = Math.max(-1, Math.min(1, dGamma / MAX_TILT_DEGREES))
    return {
      tiltX: normalizedX * MAX_TILT_ANGLE,
      tiltZ: normalizedZ * MAX_TILT_ANGLE,
    }
  }

  it('should return zero tilt when device is at calibration orientation', () => {
    const result = computeTilt(45, 0, 45, 0)
    expect(result.tiltX).toBeCloseTo(0)
    expect(result.tiltZ).toBeCloseTo(0)
  })

  it('should produce positive tiltX when tilted forward (beta increases)', () => {
    const result = computeTilt(55, 0, 45, 0)
    expect(result.tiltX).toBeGreaterThan(0)
  })

  it('should produce negative tiltX when tilted backward', () => {
    const result = computeTilt(35, 0, 45, 0)
    expect(result.tiltX).toBeLessThan(0)
  })

  it('should produce positive tiltZ when tilted right (gamma increases)', () => {
    const result = computeTilt(45, 10, 45, 0)
    expect(result.tiltZ).toBeGreaterThan(0)
  })

  it('should produce negative tiltZ when tilted left (gamma decreases)', () => {
    const result = computeTilt(45, -10, 45, 0)
    expect(result.tiltZ).toBeLessThan(0)
  })

  it('should clamp tiltX to MAX_TILT_ANGLE at 20+ degrees', () => {
    const result = computeTilt(70, 0, 45, 0) // 25 degree difference, clamped at 20
    expect(result.tiltX).toBeCloseTo(MAX_TILT_ANGLE)
  })

  it('should clamp tiltZ to -MAX_TILT_ANGLE at -20+ degrees', () => {
    const result = computeTilt(45, -30, 45, 0) // -30 difference, clamped at -20
    expect(result.tiltZ).toBeCloseTo(-MAX_TILT_ANGLE)
  })

  it('should map exactly half the range to half the max angle', () => {
    const result = computeTilt(55, 0, 45, 0) // 10/20 = 0.5 normalized
    expect(result.tiltX).toBeCloseTo(0.5 * MAX_TILT_ANGLE)
  })

  it('should handle calibration at non-zero gamma', () => {
    const result = computeTilt(45, 15, 45, 10) // delta gamma = 5
    expect(result.tiltZ).toBeCloseTo((5 / 20) * MAX_TILT_ANGLE)
  })

  it('should handle both axes simultaneously', () => {
    const result = computeTilt(55, 10, 45, 0)
    expect(result.tiltX).toBeCloseTo(0.5 * MAX_TILT_ANGLE)
    expect(result.tiltZ).toBeCloseTo(0.5 * MAX_TILT_ANGLE)
  })
})

// =============================================================================
// 2. Virtual joystick vector calculation tests
// =============================================================================
describe('Joystick vector calculations', () => {
  const OUTER_SIZE = 120
  const THUMB_SIZE = 60
  const MAX_DISTANCE = (OUTER_SIZE - THUMB_SIZE) / 2

  /** Simulate the joystick clamping and normalization logic */
  function computeJoystick(
    touchX: number,
    touchY: number,
    centerX: number,
    centerY: number,
  ): { nx: number; ny: number; dx: number; dy: number } {
    let dx = touchX - centerX
    let dy = touchY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > MAX_DISTANCE) {
      dx = (dx / dist) * MAX_DISTANCE
      dy = (dy / dist) * MAX_DISTANCE
    }
    return {
      nx: dx / MAX_DISTANCE,
      ny: dy / MAX_DISTANCE,
      dx,
      dy,
    }
  }

  it('should return zero when touch is at center', () => {
    const result = computeJoystick(200, 200, 200, 200)
    expect(result.nx).toBe(0)
    expect(result.ny).toBe(0)
  })

  it('should return normalized values within [-1, 1]', () => {
    // Touch at max distance to the right
    const result = computeJoystick(200 + MAX_DISTANCE, 200, 200, 200)
    expect(result.nx).toBeCloseTo(1)
    expect(result.ny).toBeCloseTo(0)
  })

  it('should clamp to circle boundary when touching beyond MAX_DISTANCE', () => {
    // Touch way beyond max distance
    const result = computeJoystick(200 + 100, 200, 200, 200)
    expect(Math.abs(result.nx)).toBeCloseTo(1)
    expect(Math.abs(result.ny)).toBeCloseTo(0)
    expect(Math.abs(result.dx)).toBeCloseTo(MAX_DISTANCE)
  })

  it('should handle diagonal input', () => {
    const diag = MAX_DISTANCE * Math.SQRT1_2
    const result = computeJoystick(200 + diag, 200 + diag, 200, 200)
    expect(result.nx).toBeCloseTo(Math.SQRT1_2)
    expect(result.ny).toBeCloseTo(Math.SQRT1_2)
  })

  it('should handle negative direction (up-left)', () => {
    const result = computeJoystick(200 - MAX_DISTANCE, 200 - MAX_DISTANCE, 200, 200)
    // Distance is MAX_DISTANCE * sqrt(2), gets clamped
    const magnitude = Math.sqrt(result.nx * result.nx + result.ny * result.ny)
    expect(magnitude).toBeCloseTo(1)
    expect(result.nx).toBeLessThan(0)
    expect(result.ny).toBeLessThan(0)
  })

  it('should never exceed normalized magnitude of 1', () => {
    // Test many angles
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const far = 500 // way beyond limit
      const tx = 200 + Math.cos(angle) * far
      const ty = 200 + Math.sin(angle) * far
      const result = computeJoystick(tx, ty, 200, 200)
      const magnitude = Math.sqrt(result.nx * result.nx + result.ny * result.ny)
      expect(magnitude).toBeLessThanOrEqual(1.001) // tiny float tolerance
    }
  })

  it('should produce proportional output for small movements', () => {
    // Half the max distance
    const halfDist = MAX_DISTANCE / 2
    const result = computeJoystick(200 + halfDist, 200, 200, 200)
    expect(result.nx).toBeCloseTo(0.5)
    expect(result.ny).toBeCloseTo(0)
  })
})

// =============================================================================
// 3. Camera state transition tests
// =============================================================================
describe('Camera state transitions', () => {
  // Must import after test setup
  let cameraState: typeof import('../utils/cameraState').cameraState
  let CameraPhase: typeof import('../utils/cameraState').CameraPhase

  beforeEach(async () => {
    const mod = await import('../utils/cameraState')
    cameraState = mod.cameraState
    CameraPhase = mod.CameraPhase
    cameraState.resetForLevel()
  })

  it('should start in Overview phase', () => {
    expect(cameraState.phase).toBe(CameraPhase.Overview)
    expect(cameraState.phaseTime).toBe(0)
  })

  it('should transition to Gameplay after setPhase', () => {
    cameraState.setPhase(CameraPhase.Gameplay)
    expect(cameraState.phase).toBe(CameraPhase.Gameplay)
    expect(cameraState.phaseTime).toBe(0)
  })

  it('should reset phaseTime on phase change', () => {
    cameraState.tick(0.5)
    expect(cameraState.phaseTime).toBeCloseTo(0.5)
    cameraState.setPhase(CameraPhase.Victory)
    expect(cameraState.phaseTime).toBe(0)
  })

  it('should accumulate phaseTime on tick', () => {
    cameraState.tick(0.1)
    cameraState.tick(0.2)
    expect(cameraState.phaseTime).toBeCloseTo(0.3)
  })

  it('should transition to TrapZoom phase', () => {
    cameraState.setPhase(CameraPhase.TrapZoom)
    expect(cameraState.phase).toBe(CameraPhase.TrapZoom)
  })

  it('should transition to Victory phase', () => {
    cameraState.setPhase(CameraPhase.Victory)
    expect(cameraState.phase).toBe(CameraPhase.Victory)
  })

  it('should reset to Overview on resetForLevel', () => {
    cameraState.setPhase(CameraPhase.Gameplay)
    cameraState.tick(1.0)
    cameraState.resetForLevel()
    expect(cameraState.phase).toBe(CameraPhase.Overview)
    expect(cameraState.phaseTime).toBe(0)
  })

  it('should have sensible default camera values', () => {
    expect(cameraState.overviewY).toBeGreaterThan(cameraState.gameplayY)
    expect(cameraState.victoryY).toBeGreaterThan(cameraState.gameplayY)
    expect(cameraState.overviewZ).toBeGreaterThan(cameraState.gameplayZ)
    expect(cameraState.overviewDuration).toBeGreaterThan(0)
  })
})

// =============================================================================
// 4. Input refs tests
// =============================================================================
describe('tiltInputRef', () => {
  let tiltInputRef: typeof import('../utils/inputRefs').tiltInputRef

  beforeEach(async () => {
    const mod = await import('../utils/inputRefs')
    tiltInputRef = mod.tiltInputRef
    tiltInputRef.tiltX = 0
    tiltInputRef.tiltZ = 0
    tiltInputRef.active = false
  })

  it('should have default values of 0/false', () => {
    expect(tiltInputRef.tiltX).toBe(0)
    expect(tiltInputRef.tiltZ).toBe(0)
    expect(tiltInputRef.active).toBe(false)
  })

  it('should be mutable', () => {
    tiltInputRef.tiltX = 0.1
    tiltInputRef.tiltZ = -0.05
    tiltInputRef.active = true
    expect(tiltInputRef.tiltX).toBe(0.1)
    expect(tiltInputRef.tiltZ).toBe(-0.05)
    expect(tiltInputRef.active).toBe(true)
  })
})

// =============================================================================
// 5. Reduced motion utility tests
// =============================================================================
describe('prefersReducedMotion', () => {
  it('should return a boolean', async () => {
    // Mock matchMedia
    const original = globalThis.window?.matchMedia
    globalThis.window = globalThis.window ?? {} as Window & typeof globalThis
    Object.defineProperty(globalThis.window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })

    const { prefersReducedMotion } = await import('../hooks/useReducedMotion')
    const result = prefersReducedMotion()
    expect(typeof result).toBe('boolean')

    // Restore
    if (original) {
      Object.defineProperty(globalThis.window, 'matchMedia', { value: original, writable: true, configurable: true })
    }
  })
})

// =============================================================================
// 6. CameraPhase const object tests
// =============================================================================
describe('CameraPhase constants', () => {
  it('should have all expected phases', async () => {
    const { CameraPhase } = await import('../utils/cameraState')
    expect(CameraPhase.Overview).toBe('overview')
    expect(CameraPhase.Gameplay).toBe('gameplay')
    expect(CameraPhase.TrapZoom).toBe('trapZoom')
    expect(CameraPhase.Victory).toBe('victory')
  })
})
