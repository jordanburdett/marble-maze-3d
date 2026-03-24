/**
 * useReducedMotion — Returns true when the user prefers reduced motion.
 * Used to skip/snap JS animations (R3F, rAF) when enabled.
 * CSS animations are already handled by the prefers-reduced-motion media query in index.css.
 */

import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

/**
 * Non-hook version for use in non-component contexts (e.g., AudioEngine, rAF loops).
 * Reads the media query directly — does not react to changes.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
