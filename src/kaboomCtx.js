
import kaboom from "kaboom";
import { scaleFactor } from "./dailog";

export const k = kaboom({
  global: false,
  touchToMouse: true,
  canvas: document.getElementById("game"),
  debug: false, // set to false once ready for production
});


// Add audio configuration
// k.loadSound("bg-music", "./assets/background.mp3");
// k.loadSound("footsteps", "./assets/footsteps.mp3");

