import { dialogueData, scaleFactor } from "./dailog";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

// Load audio files
k.loadSound("bg-music", "./background.mp3");      // Background music for the game
k.loadSound("footsteps", "./footsteps.mp3");      // Footstep sound effect for player movement

// Load the character spritesheet with animations
k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,  // 39 columns in the spritesheet grid
  sliceY: 31,  // 31 rows in the spritesheet grid
  anims: {
    // Character animations for different directions and states:
    "idle-down": 936,  // Single frame for idle facing down
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },  // 4-frame walking down animation
    "idle-side": 975,  // Single frame for idle facing sideways
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },  // 4-frame walking sideways animation
    "idle-up": 1014,   // Single frame for idle facing up
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },  // 4-frame walking up animation
  },
});

// Load both game maps (outdoor and indoor environments)
k.loadSprite("outdoor", "./outdoor4.png");
k.loadSprite("indoor", "./map1.png");

// Set initial background color to black (will be covered by map sprites)
k.setBackground(k.Color.fromHex("#000000"));

// Simple audio state management object to track audio playback
const audioState = {
  bgMusicPlaying: true,        // Flag for background music state
  bgMusicLoop: null,           // Reference to the background music loop
  footstepLoop: null,          // Reference to the footstep sound loop
  lastFootstepTime: 0,         // Timestamp for footstep timing (not currently used)
};

// Variables to track player position across scene transitions
let playerSpawnPoint = null;   // Where player spawns initially
let playerExitPoint = null;    // Where player exits to (for scene transitions)

/**
 * Play background music
 * Stops any existing music and starts a new loop
 */
function playBackgroundMusic() {
  if (audioState.bgMusicLoop) {
    audioState.bgMusicLoop.stop();  // Stop current music if playing
  }
  
  // Play music with volume and loop settings
  audioState.bgMusicLoop = k.play("bg-music", {
    volume: 0.3,    // 30% volume
    loop: true,     // Loop continuously
  });
  audioState.bgMusicPlaying = true;  // Update state
}

/**
 * Stop background music
 */
function stopBackgroundMusic() {
  if (audioState.bgMusicLoop) {
    audioState.bgMusicLoop.stop();   // Stop the music
    audioState.bgMusicLoop = null;   // Clear reference
  }
  audioState.bgMusicPlaying = false; // Update state
}

/**
 * Start playing footstep sounds in a loop
 * Used when player starts moving
 */
function startFootsteps() {
  // Clear any existing footstep loop
  stopFootsteps();
  
  // Create a new loop that plays footsteps every 0.35 seconds
  audioState.footstepLoop = k.loop(0.35, () => {
    k.play("footsteps", {
      volume: 0.15,               // 15% volume
      speed: 1.2,                 // Slightly faster playback
      detune: k.rand(-100, 100),  // Random pitch variation for realism
    });
  });
}

/**
 * Stop playing footstep sounds
 */
function stopFootsteps() {
  if (audioState.footstepLoop) {
    audioState.footstepLoop.cancel();  // Cancel the loop
    audioState.footstepLoop = null;    // Clear reference
  }
}

// =============================================
// OUTDOOR SCENE
// =============================================
k.scene("outdoor", async () => {
  // Load map data from JSON file
  const mapData = await (await fetch("./outdoor4.json")).json();
  const layers = mapData.layers;

  // Create the outdoor map sprite
  const map = k.add([k.sprite("outdoor"), k.pos(0), k.scale(scaleFactor)]);

  // Create player character with all components and properties
  const player = k.make([
    k.sprite("spritesheet", { anim: "idle-down" }),  // Start with idle down animation
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),  // Collision area (offset and size)
    }),
    k.body(),                    // Physics body component
    k.anchor("center"),          // Anchor point for positioning
    k.pos(),                     // Position (will be set later)
    k.scale(scaleFactor),        // Scale to match map
    {
      // Custom player properties
      speed: 250,                // Movement speed in pixels per second
      direction: "down",         // Current facing direction
      isInDialogue: false,       // Dialogue state flag
      isMoving: false,           // Movement state flag
    },
    "player",                    // Tag for easy reference
  ]);

  // Process map layers to set up the game world
  for (const layer of layers) {
    if (layer.name === "boundaries") {
      // Create collision boundaries and interactive objects
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),  // Static objects don't move
          k.pos(boundary.x, boundary.y),  // Position from map data
          boundary.name,               // Give object a name for identification
        ]);

        // Set up collision interactions based on object type
        if (boundary.name) {
          if (boundary.name === "door" || boundary.name === "exit") {
            // Transition between scenes
            player.onCollide(boundary.name, () => {
              if (boundary.name === "door") {
                stopFootsteps();      // Stop footstep sounds
                k.go("indoor");       // Switch to indoor scene
              } else if (boundary.name === "exit") {
                stopFootsteps();      // Stop footstep sounds
                playerExitPoint = true;  // Mark that player is exiting
                k.go("outdoor");      // Return to outdoor scene
              }
            });
          } else {
            // Interactive objects that trigger dialogue
            player.onCollide(boundary.name, () => {
              if (boundary.name !== "wall" && boundary.name !== "exit" && boundary.name !== "spawnpoints") {
                stopFootsteps();          // Stop movement sounds
                player.isInDialogue = true;  // Set dialogue state
                // Display dialogue from dialogue data
                displayDialogue(
                  dialogueData[boundary.name],
                  () => (player.isInDialogue = false)  // Callback when dialogue ends
                );
              }
            });
          }
        }
      }
      continue;  // Skip to next layer
    }

    if (layer.name === "spawnpoints") {
      // Find player spawn point from map data
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          playerSpawnPoint = entity;  // Store spawn point
        }
      }
    }
  }

  // Set player position based on game state
  if (playerExitPoint) {
    // If player is exiting from another scene, spawn at exit position
    player.pos = k.vec2(270 * scaleFactor, 160 * scaleFactor);
  } else if (playerSpawnPoint) {
    // Use spawn point from map data
    player.pos = k.vec2(
      (map.pos.x + playerSpawnPoint.x) * scaleFactor,
      (map.pos.y + playerSpawnPoint.y) * scaleFactor
    );
  } else {
    // Default spawn position if no spawn point found
    player.pos = k.vec2(260 * scaleFactor, 280 * scaleFactor);
  }

  // Add player to the scene
  k.add(player);

  // Set up camera scaling
  setCamScale(k);

  // Update camera scale on window resize
  k.onResize(() => {
    setCamScale(k);
  });

  // Position camera slightly above player
  k.camPos(player.pos.x, player.pos.y - 100);

  // Update camera to follow player
  k.onUpdate(() => {
    if (player.exists()) {
      k.camPos(player.pos.x, player.pos.y - 100);
    }
  });

  // =============================================
  // MOUSE CONTROLS (Click to move)
  // =============================================
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;  // Only left click, no dialogue

    // Start footstep sounds if player wasn't already moving
    if (!player.isMoving) {
      player.isMoving = true;
      startFootsteps();
    }

    // Get mouse position in world coordinates
    const worldMousePos = k.toWorld(k.mousePos());
    // Move player to mouse position
    player.moveTo(worldMousePos, player.speed);

    // Calculate angle between player and mouse for direction
    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 50;   // Angle threshold for left/right
    const upperBound = 125;  // Angle threshold for up/down

    // Determine animation based on movement direction:
    // Up (angles between 50 and 125 degrees)
    if (mouseAngle > lowerBound && mouseAngle < upperBound && player.curAnim() !== "walk-up") {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    // Down (angles between -50 and -125 degrees)
    if (mouseAngle < -lowerBound && mouseAngle > -upperBound && player.curAnim() !== "walk-down") {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    // Right (angles less than -125 or greater than 125 degrees)
    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;  // No flip for right
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    // Left (angles between -50 and 50 degrees)
    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;   // Flip for left
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  /**
   * Stop animations and movement when mouse is released
   */
  function stopAnims() {
    // Stop player movement
    player.stop();
    
    // Stop footsteps if player was moving
    if (player.isMoving) {
      player.isMoving = false;
      stopFootsteps();
    }
    
    // Set appropriate idle animation based on direction
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

  // Call stopAnims when mouse button is released
  k.onMouseRelease(stopAnims);

  // =============================================
  // KEYBOARD CONTROLS (Arrow keys/WASD)
  // =============================================
  let keyMovementActive = false;  // Track if keyboard movement is active
  
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;  // No movement during dialogue
    
    // Check which movement keys are currently pressed
    const keyMap = [
      k.isKeyDown("right"),  // Right arrow or D
      k.isKeyDown("left"),   // Left arrow or A
      k.isKeyDown("up"),     // Up arrow or W
      k.isKeyDown("down"),   // Down arrow or S
    ];
    
    const isMoving = keyMap[0] || keyMap[1] || keyMap[2] || keyMap[3];
    
    // Start footsteps if movement begins
    if (isMoving && !player.isMoving) {
      player.isMoving = true;
      startFootsteps();
      keyMovementActive = true;
    }
    
    // Handle movement in each direction:
    // Right
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);  // Move right
      return;
    }

    // Left
    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);  // Move left
      return;
    }

    // Up
    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);  // Move up
      return;
    }

    // Down
    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);  // Move down
    }
  });
  
  // Handle key release for keyboard controls
  k.onKeyRelease((key) => {
    // Check if any movement keys are still pressed
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
      
      // Set appropriate idle animation
      if (player.direction === "down") {
        player.play("idle-down");
      } else if (player.direction === "up") {
        player.play("idle-up");
      } else {
        player.play("idle-side");
      }
    }
  });

  // Audio control: M key toggles background music
  k.onKeyPress("m", () => {
    if (audioState.bgMusicPlaying) {
      stopBackgroundMusic();
    } else {
      playBackgroundMusic();
    }
  });
});

// =============================================
// INDOOR SCENE
// =============================================
k.scene("indoor", async () => {
  // Note: Indoor scene structure is very similar to outdoor scene
  // Only key differences are noted below
  
  const mapData = await (await fetch("./map1.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("indoor"), k.pos(0), k.scale(scaleFactor)]);

  // Player creation (identical to outdoor scene)
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

  // Process indoor map layers
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
          // KEY DIFFERENCE: Indoor scene has different exit behavior
          if (boundary.name === "door") {
            player.onCollide(boundary.name, () => {
              stopFootsteps();
              k.go("indoor");  // Stays in indoor scene (possibly different room)
            }); 
          } else if (boundary.name === "exit") {
            // Exit from indoor to outdoor
            player.onCollide(boundary.name, () => {
              stopFootsteps();
              playerExitPoint = true;  // Mark exit for outdoor scene
              k.go("outdoor");
            });
          } else {
            // Interactive objects with dialogue
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

  // Set player position (similar logic to outdoor)
  if (playerSpawnPoint) {
    player.pos = k.vec2(
      (map.pos.x + playerSpawnPoint.x) * scaleFactor,
      (map.pos.y + playerSpawnPoint.y) * scaleFactor
    );
  } else if (playerExitPoint) {
    player.pos = k.vec2(200 * scaleFactor, 200 * scaleFactor);
  } else {
    player.pos = k.vec2(200 * scaleFactor, 200 * scaleFactor);
  }

  // Add player to scene
  k.add(player);

  // Camera setup (identical to outdoor)
  setCamScale(k);
  k.onResize(() => {
    setCamScale(k);
  });
  k.camPos(player.pos.x, player.pos.y - 100);
  k.onUpdate(() => {
    if (player.exists()) {
      k.camPos(player.pos.x, player.pos.y - 100);
    }
  });

  // Controls (identical to outdoor scene - mouse and keyboard)
  // Mouse controls:
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;
    if (!player.isMoving) {
      player.isMoving = true;
      startFootsteps();
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

  function stopAnims() {
    player.stop();
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

  // Keyboard controls:
  let keyMovementActive = false;
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
      startFootsteps();
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
      stopFootsteps();
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

  // Audio control (identical to outdoor)
  k.onKeyPress("m", () => {
    if (audioState.bgMusicPlaying) {
      stopBackgroundMusic();
    } else {
      playBackgroundMusic();
    }
  });
});

// =============================================
// GAME INITIALIZATION
// =============================================
// Start the game with the outdoor scene
k.go("outdoor");
// Begin playing background music
playBackgroundMusic();