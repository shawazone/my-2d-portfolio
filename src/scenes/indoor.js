// scenes/indoor.js
import { k } from "../config.js";
import { createBaseScene } from "./baseScene.js";

k.scene("indoor", async () => {
  await createBaseScene("indoor", "indoor", "./map1.json");
});