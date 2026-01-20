// entities/player.js
import { k, scaleFactor, playerAnims } from "../config.js";
import { audioManager } from "../audio/audioManager.js";

export function createPlayer() {
  return k.make([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    {
      speed: 250,
      direction: "down",
      isInDialogue: false,
      isMoving: false,
    },
    "player",
  ]);
}

export function setupPlayerControls(player) {
  let keyMovementActive = false;

  // Mouse controls
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    if (!player.isMoving) {
      player.isMoving = true;
      audioManager.startFootsteps();
    }

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 50;
    const upperBound = 125;

    if (mouseAngle > lowerBound && mouseAngle < upperBound && player.curAnim() !== "walk-up") {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (mouseAngle < -lowerBound && mouseAngle > -upperBound && player.curAnim() !== "walk-down") {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  // Stop animations function
  function stopAnims() {
    player.stop();
    
    if (player.isMoving) {
      player.isMoving = false;
      audioManager.stopFootsteps();
    }
    
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }
    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  // Keyboard controls
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;
    
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    if (isMoving && !player.isMoving) {
      player.isMoving = true;
      audioManager.startFootsteps();
      keyMovementActive = true;
    }
    
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
  
  k.onKeyRelease((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    if (!isMoving && keyMovementActive) {
      keyMovementActive = false;
      player.isMoving = false;
      audioManager.stopFootsteps();
      player.stop();
      
      if (player.direction === "down") {
        player.play("idle-down");
      } else if (player.direction === "up") {
        player.play("idle-up");
      } else {
        player.play("idle-side");
      }
    }
  });

  // Audio toggle
  k.onKeyPress("m", () => {
    audioManager.toggleMusic();
  });
}