// scenes/baseScene.js
import { k, scaleFactor, dialogueData } from "../config.js";
import { setCamScale, displayDialogue } from "../utils.js";
import { audioManager } from "../audio/audioManager.js";
import { createPlayer, setupPlayerControls } from "../entities/player.js";

// Global state
export let playerSpawnPoint = null;
export let playerExitPoint = null;

export async function createBaseScene(mapKey, mapImage, mapJson) {
  const mapData = await (await fetch(mapJson)).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite(mapImage), k.pos(0), k.scale(scaleFactor)]);
  const player = createPlayer();

  // Process map layers
  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        const boundaryObj = map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        if (boundary.name) {
          setupBoundaryCollision(player, boundary.name, mapKey);
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
  setPlayerPosition(player, map, mapKey);

  // Add player and setup
  k.add(player);
  setupCamera(player);
  setupPlayerControls(player);

  return { player, map };
}

function setupBoundaryCollision(player, boundaryName, sceneType) {
  player.onCollide(boundaryName, () => {
    audioManager.stopFootsteps();
    
    if (boundaryName === "door") {
      if (sceneType === "outdoor") {
        k.go("indoor");
      } else {
        k.go("indoor");
      }
    } else if (boundaryName === "exit") {
      playerExitPoint = true;
      if (sceneType === "indoor") {
        k.go("outdoor");
      } else {
        k.go("outdoor");
      }
    } else if (boundaryName !== "wall" && boundaryName !== "exit" && boundaryName !== "spawnpoints") {
      player.isInDialogue = true;
      displayDialogue(
        dialogueData[boundaryName],
        () => (player.isInDialogue = false)
      );
    }
  });
}

function setPlayerPosition(player, map, sceneType) {
  if (sceneType === "outdoor" && playerExitPoint) {
    player.pos = k.vec2(270 * scaleFactor, 160 * scaleFactor);
  } else if (playerSpawnPoint) {
    player.pos = k.vec2(
      (map.pos.x + playerSpawnPoint.x) * scaleFactor,
      (map.pos.y + playerSpawnPoint.y) * scaleFactor
    );
  } else {
    const defaultPos = sceneType === "outdoor" 
      ? k.vec2(260 * scaleFactor, 280 * scaleFactor)
      : k.vec2(200 * scaleFactor, 200 * scaleFactor);
    player.pos = defaultPos;
  }
}

function setupCamera(player) {
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
}