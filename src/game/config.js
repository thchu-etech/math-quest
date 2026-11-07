import * as Phaser from "phaser";
import MathPlanetScene from "./scenes/MathPlanetScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 560,
  parent: "game-root",
  backgroundColor: "#bfe5ff",
  render: { antialias: true, pixelArt: false },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1050 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 560,
  },
  scene: [MathPlanetScene],
};
