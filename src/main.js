// main.js
import { k, playerAnims } from "./config.js";
import { audioManager } from "./audio/audioManager.js";
import "./scenes/outdoor.js";
import "./scenes/indoor.js";

// Load assets
k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: playerAnims,
});

k.loadSprite("outdoor", "./outdoor4.png");
k.loadSprite("indoor", "./map1.png");

audioManager.loadAudio();

// Set background
k.setBackground(k.Color.fromHex("#000000"));

// Start game
k.go("outdoor");
audioManager.playBackgroundMusic();