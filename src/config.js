// config.js
import { dialogueData, scaleFactor } from "./dialogue";
import { k } from "./kaboomCtx";

// Export configurations
export { k, dialogueData, scaleFactor };

// Animation configurations
export const playerAnims = {
  "idle-down": 936,
  "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
  "idle-side": 975,
  "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
  "idle-up": 1014,
  "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
};