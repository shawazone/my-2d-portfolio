// scenes/outdoor.js
import { k } from "../config.js";
import { createBaseScene } from "./baseScene.js";

k.scene("outdoor", async () => {
  await createBaseScene("outdoor", "outdoor", "./outdoor5.json");
});