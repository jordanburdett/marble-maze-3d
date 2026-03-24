# Marble Maze 3D

## What This Is
A 3D marble maze browser game built with React, Three.js (via React Three Fiber), and Rapier physics. Players tilt a board to guide a marble through mazes, collecting gems and avoiding trap holes.

## Tech Stack
- **React 19** + TypeScript 5.9
- **Three.js** via `@react-three/fiber` (R3F)
- **@react-three/drei** for helpers (Environment, AdaptiveDpr, etc.)
- **@react-three/rapier** for physics (Rapier WASM)
- **Zustand 5** for state management
- **Vite 8** for bundling

## Build Commands
- `npm run dev` — Start dev server
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint
- `npm test` — Vitest

## Key Conventions
- `base: './'` in vite.config.ts is CRITICAL for portal iframe embedding
- No `enum` keyword — use `as const` objects + type unions (erasableSyntaxOnly)
- No shadows — use baked ambient occlusion only
- All game state through Zustand store — no prop drilling
- Physics timestep fixed at 1/60
- Target under 50 draw calls — use InstancedMesh for walls
- `@media (prefers-reduced-motion: reduce)` disables animations

## Project Structure
```
src/
  store/gameStore.ts    — Zustand game state
  data/levels.ts        — Level definitions (wall segments, gems, holes)
  hooks/useInput.ts     — Keyboard/mouse input to board tilt
  components/
    GameScene.tsx       — R3F Canvas + Physics wrapper
    MazeBoard.tsx       — Board mesh + wall instances + tilt control
    Marble.tsx          — Physics marble with reflections
    Gem.tsx             — Collectible gem with rotation
    HUD.tsx             — HTML overlay (timer, gems, pause)
  App.tsx               — Root: menu/game routing
```

## Architecture Notes
- MazeBoard is a kinematic RigidBody that tilts via rotation updates
- Marble is a dynamic RigidBody rolling on the tilted board
- Input hook exports tilt refs read by MazeBoard each physics frame
- Level data is pure data arrays — no components
- Camera follows marble with smooth lerp
