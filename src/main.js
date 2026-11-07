import * as Phaser from "phaser";
import "./style.css";
import { gameConfig } from "./game/config.js";
import { gameElements } from "./game/ui/elements.js";

const game = new Phaser.Game(gameConfig);
let scene = null;

gameElements.startButton.disabled = true;
const waitForScene = () => {
  const candidate = game.scene.getScene("MathPlanet");
  if (candidate && candidate.sys && candidate.sys.isActive()) {
    scene = candidate;
    gameElements.startButton.disabled = false;
    return;
  }
  window.setTimeout(waitForScene, 40);
};
waitForScene();

gameElements.startButton.addEventListener("click", () => {
  gameElements.startScreen.hidden = true;
  if (scene) scene.begin();
});

gameElements.nextLevelButton.addEventListener("click", () => {
  gameElements.levelClearScreen.hidden = true;
  if (scene) scene.nextLevel();
});

gameElements.restartButton.addEventListener("click", () => {
  gameElements.completeScreen.hidden = true;
  if (scene) scene.restart();
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const press = (event) => {
    event.preventDefault();
    if (!scene) return;
    if (control === "jump") scene.touchState.jump = true;
    else scene.touchState[control] = true;
    if (button.setPointerCapture && event.pointerId !== undefined) {
      button.setPointerCapture(event.pointerId);
    }
  };
  const release = () => {
    if (scene && control !== "jump") scene.touchState[control] = false;
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});
