/**
 * Shared mutable refs for input state.
 * Used to communicate between the React overlay (VirtualJoystick)
 * and the R3F scene graph (useInput hook) without prop drilling.
 */

/** Virtual joystick input state — written by VirtualJoystick, read by useInput */
export const joystickInputRef = {
  x: 0,
  y: 0,
  active: false,
}

/** Device tilt input state — written by useTiltControls, read by useInput */
export const tiltInputRef = {
  tiltX: 0,
  tiltZ: 0,
  active: false,
}
