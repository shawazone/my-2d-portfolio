import { dialogueData, scaleFactor } from "./dailog";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

// Load audio files
k.loadSound("bg-music", "./background.mp3");
k.loadSound("footsteps", "./footsteps.mp3");

k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

// Load both maps
k.loadSprite("outdoor", "./outdoor1.png");
k.loadSprite("indoor", "./map.png");

k.setBackground(k.Color.fromHex("#000000"));

// Simple audio state management
const audioState = {
  bgMusicPlaying: true,
  bgMusicLoop: null,
  footstepLoop: null,
  lastFootstepTime: 0,
};

function playBackgroundMusic() {
  if (audioState.bgMusicLoop) {
    audioState.bgMusicLoop.stop();
  }
  
  audioState.bgMusicLoop = k.play("bg-music", {
    volume: 0.3,
    loop: true,
  });
  audioState.bgMusicPlaying = true;
}

function stopBackgroundMusic() {
  if (audioState.bgMusicLoop) {
    audioState.bgMusicLoop.stop();
    audioState.bgMusicLoop = null;
  }
  audioState.bgMusicPlaying = false;
}

function startFootsteps() {
  // Clear any existing footstep loop
  stopFootsteps();
  
  // Play footstep sound at walking rhythm (every 0.35 seconds)
  audioState.footstepLoop = k.loop(0.35, () => {
    k.play("footsteps", {
      volume: 0.15,
      speed: 1.2,
      detune: k.rand(-100, 100),
    });
  });
}

function stopFootsteps() {
  if (audioState.footstepLoop) {
    audioState.footstepLoop.cancel();
    audioState.footstepLoop = null;
  }
}

// OUTDOOR SCENE
k.scene("outdoor", async () => {
  const mapData = await (await fetch("./outdoor1.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("outdoor"), k.pos(0), k.scale(scaleFactor)]);

  const player = k.make([
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

  // Store spawn point to use after player is added
  let playerSpawnPoint = null;

  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        if (boundary.name) {
          if (boundary.name === "door" || boundary.name === "exit") {
            player.onCollide(boundary.name, () => {
              if (boundary.name === "door" || boundary.name === "exit") {
                stopFootsteps();
                k.go("indoor");
              }
            });
          } else {
            player.onCollide(boundary.name, () => {
              if (boundary.name !== "wall" && boundary.name !== "exit") {
                stopFootsteps();
                player.isInDialogue = true;
                displayDialogue(
                  dialogueData[boundary.name],
                  () => (player.isInDialogue = false)
                );
              }
            });
          }
        }
      }
      continue;
    }

    if (layer.name === "spawnpoints") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          playerSpawnPoint = entity;
        }
      }
    }
  }

  // Set player position
  if (playerSpawnPoint) {
    player.pos = k.vec2(
      (map.pos.x + playerSpawnPoint.x) * scaleFactor,
      (map.pos.y + playerSpawnPoint.y) * scaleFactor
    );
  } else {
    player.pos = k.vec2(269 * scaleFactor, 280 * scaleFactor);
  }

  // Add player to scene
  k.add(player);

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  // Camera positioning
  k.camPos(player.pos.x, player.pos.y - 100);

  k.onUpdate(() => {
    if (player.exists()) {
      k.camPos(player.pos.x, player.pos.y - 100);
    }
  });

  // Mouse controls - FIXED to only start footsteps when movement begins
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    // Only start footsteps if not already moving
    if (!player.isMoving) {
      player.isMoving = true;
      startFootsteps();
    }

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
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

  function stopAnims() {
    // Stop player movement
    player.stop();
    
    // Stop footsteps if player was moving
    if (player.isMoving) {
      player.isMoving = false;
      stopFootsteps();
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

  // Handle keyboard movement - SIMPLIFIED APPROACH
  let keyMovementActive = false;
  
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;
    
    // Check if any movement key is pressed
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    // Start footsteps if movement begins
    if (isMoving && !player.isMoving) {
      player.isMoving = true;
      startFootsteps();
      keyMovementActive = true;
    }
    
    // Handle movement direction
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
    // Check if movement keys are still pressed
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    // Stop footsteps if no movement keys are pressed
    if (!isMoving && keyMovementActive) {
      keyMovementActive = false;
      player.isMoving = false;
      stopFootsteps();
      
      // Stop player movement
      player.stop();
      
      // Set idle animation
      if (player.direction === "down") {
        player.play("idle-down");
      } else if (player.direction === "up") {
        player.play("idle-up");
      } else {
        player.play("idle-side");
      }
    }
  });

  // Add keyboard controls for audio
  k.onKeyPress("m", () => {
    if (audioState.bgMusicPlaying) {
      stopBackgroundMusic();
    } else {
      playBackgroundMusic();
    }
  });
});

// INDOOR SCENE
k.scene("indoor", async () => {
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("indoor"), k.pos(0), k.scale(scaleFactor)]);

  const player = k.make([
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

  let playerSpawnPoint = null;

  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        if (boundary.name) {
          if (boundary.name === "door" || boundary.name === "exit") {
            player.onCollide(boundary.name, () => {
              stopFootsteps();
              k.go("outdoor");
            });
          } else {
            player.onCollide(boundary.name, () => {
              stopFootsteps();
              player.isInDialogue = true;
              displayDialogue(
                dialogueData[boundary.name],
                () => (player.isInDialogue = false)
              );
            });
          }
        }
      }
      continue;
    }

    if (layer.name === "spawnpoints") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          playerSpawnPoint = entity;
        }
      }
    }
  }

  // Set player position
  if (playerSpawnPoint) {
    player.pos = k.vec2(
      (map.pos.x + playerSpawnPoint.x) * scaleFactor,
      (map.pos.y + playerSpawnPoint.y) * scaleFactor
    );
  } else {
    player.pos = k.vec2(200 * scaleFactor, 200 * scaleFactor);
  }

  // Add player to scene
  k.add(player);

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  // Camera positioning
  k.camPos(player.pos.x, player.pos.y - 100);

  k.onUpdate(() => {
    if (player.exists()) {
      k.camPos(player.pos.x, player.pos.y - 100);
    }
  });

  // Mouse controls
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    // Only start footsteps if not already moving
    if (!player.isMoving) {
      player.isMoving = true;
      startFootsteps();
    }

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
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

  function stopAnims() {
    // Stop player movement
    player.stop();
    
    // Stop footsteps if player was moving
    if (player.isMoving) {
      player.isMoving = false;
      stopFootsteps();
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

  // Handle keyboard movement for indoor scene
  let keyMovementActive = false;
  
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;
    
    // Check if any movement key is pressed
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    // Start footsteps if movement begins
    if (isMoving && !player.isMoving) {
      player.isMoving = true;
      startFootsteps();
      keyMovementActive = true;
    }
    
    // Handle movement direction
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
    // Check if movement keys are still pressed
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    // Stop footsteps if no movement keys are pressed
    if (!isMoving && keyMovementActive) {
      keyMovementActive = false;
      player.isMoving = false;
      stopFootsteps();
      
      // Stop player movement
      player.stop();
      
      // Set idle animation
      if (player.direction === "down") {
        player.play("idle-down");
      } else if (player.direction === "up") {
        player.play("idle-up");
      } else {
        player.play("idle-side");
      }
    }
  });

  // Add keyboard controls for audio
  k.onKeyPress("m", () => {
    if (audioState.bgMusicPlaying) {
      stopBackgroundMusic();
    } else {
      playBackgroundMusic();
    }
  });
});

// Start with outdoor scene
k.go("outdoor");
playBackgroundMusic();  