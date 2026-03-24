import { describe, it, expect, beforeEach } from 'vitest'
import { trajectoryRecorder } from '../utils/trajectoryRecorder'

describe('trajectoryRecorder', () => {
  beforeEach(() => {
    trajectoryRecorder.clear()
  })

  describe('startRecording / stopRecording lifecycle', () => {
    it('should not be recording initially after clear', () => {
      expect(trajectoryRecorder.isRecording()).toBe(false)
    })

    it('should be recording after startRecording', () => {
      trajectoryRecorder.startRecording()
      expect(trajectoryRecorder.isRecording()).toBe(true)
    })

    it('should stop recording after stopRecording', () => {
      trajectoryRecorder.startRecording()
      trajectoryRecorder.stopRecording()
      expect(trajectoryRecorder.isRecording()).toBe(false)
    })

    it('should clear all data and stop recording on clear', () => {
      trajectoryRecorder.startRecording()
      // Record enough frames to store some (every 3rd)
      for (let i = 0; i < 9; i++) {
        trajectoryRecorder.recordFrame(i, 0, 0, 1, i * 0.016)
      }
      expect(trajectoryRecorder.frameCount()).toBeGreaterThan(0)
      trajectoryRecorder.clear()
      expect(trajectoryRecorder.isRecording()).toBe(false)
      expect(trajectoryRecorder.frameCount()).toBe(0)
      expect(trajectoryRecorder.getTrajectory()).toEqual([])
    })

    it('should clear previous data on startRecording', () => {
      trajectoryRecorder.startRecording()
      for (let i = 0; i < 9; i++) {
        trajectoryRecorder.recordFrame(i, 0, 0, 1, i * 0.016)
      }
      expect(trajectoryRecorder.frameCount()).toBeGreaterThan(0)
      trajectoryRecorder.startRecording()
      expect(trajectoryRecorder.frameCount()).toBe(0)
    })
  })

  describe('recordFrame', () => {
    it('should not record frames when not recording', () => {
      trajectoryRecorder.recordFrame(1, 2, 3, 4, 0.5)
      expect(trajectoryRecorder.frameCount()).toBe(0)
    })

    it('should throttle to every 3rd frame', () => {
      trajectoryRecorder.startRecording()
      // Frames 1, 2 skipped; frame 3 recorded; frames 4,5 skipped; frame 6 recorded
      for (let i = 0; i < 6; i++) {
        trajectoryRecorder.recordFrame(i, 0, 0, 1, i * 0.016)
      }
      expect(trajectoryRecorder.frameCount()).toBe(2)
    })

    it('should record correct data on every 3rd frame', () => {
      trajectoryRecorder.startRecording()
      // Record frames: only 3rd, 6th, 9th will be stored
      for (let i = 1; i <= 9; i++) {
        trajectoryRecorder.recordFrame(i * 10, i * 20, i * 30, i * 0.5, i * 0.016)
      }
      const trajectory = trajectoryRecorder.getTrajectory()
      expect(trajectory).toHaveLength(3)

      // 3rd frame: i=3
      expect(trajectory[0]).toEqual({
        x: 30,
        y: 60,
        z: 90,
        speed: 1.5,
        t: 0.048,
      })

      // 6th frame: i=6
      expect(trajectory[1]).toEqual({
        x: 60,
        y: 120,
        z: 180,
        speed: 3.0,
        t: 0.096,
      })
    })

    it('should achieve ~20 samples/sec at 60fps (every 3rd frame)', () => {
      trajectoryRecorder.startRecording()
      // Simulate 60 physics frames (1 second at 60fps)
      for (let i = 0; i < 60; i++) {
        trajectoryRecorder.recordFrame(0, 0, 0, 1, i / 60)
      }
      // Every 3rd frame: 60 / 3 = 20 samples
      expect(trajectoryRecorder.frameCount()).toBe(20)
    })
  })

  describe('getTrajectory', () => {
    it('should return a copy, not a reference', () => {
      trajectoryRecorder.startRecording()
      for (let i = 0; i < 3; i++) {
        trajectoryRecorder.recordFrame(1, 2, 3, 4, 0.5)
      }
      const t1 = trajectoryRecorder.getTrajectory()
      const t2 = trajectoryRecorder.getTrajectory()
      expect(t1).toEqual(t2)
      expect(t1).not.toBe(t2)
    })

    it('should return empty array when no frames recorded', () => {
      trajectoryRecorder.startRecording()
      expect(trajectoryRecorder.getTrajectory()).toEqual([])
    })

    it('should preserve data after stopRecording', () => {
      trajectoryRecorder.startRecording()
      for (let i = 0; i < 6; i++) {
        trajectoryRecorder.recordFrame(i, 0, 0, 1, i * 0.016)
      }
      trajectoryRecorder.stopRecording()
      expect(trajectoryRecorder.frameCount()).toBe(2)
      expect(trajectoryRecorder.getTrajectory()).toHaveLength(2)
    })
  })

  describe('data format', () => {
    it('should store TrajectoryFrame objects with x, y, z, speed, t', () => {
      trajectoryRecorder.startRecording()
      for (let i = 0; i < 3; i++) {
        trajectoryRecorder.recordFrame(1.5, 2.5, 3.5, 4.5, 0.123)
      }
      const frames = trajectoryRecorder.getTrajectory()
      expect(frames).toHaveLength(1)
      const frame = frames[0]
      expect(frame).toHaveProperty('x', 1.5)
      expect(frame).toHaveProperty('y', 2.5)
      expect(frame).toHaveProperty('z', 3.5)
      expect(frame).toHaveProperty('speed', 4.5)
      expect(frame).toHaveProperty('t', 0.123)
    })
  })
})
