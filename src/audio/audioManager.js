// audio/audioManager.js
import { k } from "../config.js";

class AudioManager {
  constructor() {
    this.bgMusicPlaying = true;
    this.bgMusicLoop = null;
    this.footstepLoop = null;
    this.lastFootstepTime = 0;
  }

  loadAudio() {
    k.loadSound("bg-music", "./background.mp3");
    k.loadSound("footsteps", "./footsteps.mp3");
  }

  playBackgroundMusic() {
    if (this.bgMusicLoop) {
      this.bgMusicLoop.stop();
    }
    
    this.bgMusicLoop = k.play("bg-music", {
      volume: 0.3,
      loop: true,
    });
    this.bgMusicPlaying = true;
  }

  stopBackgroundMusic() {
    if (this.bgMusicLoop) {
      this.bgMusicLoop.stop();
      this.bgMusicLoop = null;
    }
    this.bgMusicPlaying = false;
  }

  startFootsteps() {
    this.stopFootsteps();
    
    this.footstepLoop = k.loop(0.35, () => {
      k.play("footsteps", {
        volume: 0.15,
        speed: 1.2,
        detune: k.rand(-100, 100),
      });
    });
  }

  stopFootsteps() {
    if (this.footstepLoop) {
      this.footstepLoop.cancel();
      this.footstepLoop = null;
    }
  }

  toggleMusic() {
    if (this.bgMusicPlaying) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  }
}

export const audioManager = new AudioManager();