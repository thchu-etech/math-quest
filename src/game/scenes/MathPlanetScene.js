import * as Phaser from "phaser";
import { levels } from "../data/levels.js";
import { gameElements } from "../ui/elements.js";

const asset = (path) =>
  import.meta.env.BASE_URL + "assets/kenney/new-platformer-pack/" + path;

const CHARACTER_PATH = "Sprites/Characters/Default/";
const BACKGROUND_PATH = "Sprites/Backgrounds/Default/";
const TILE_PATH = "Sprites/Tiles/Default/";

const PLATFORM_LAYOUT = [
  { x: 480, y: 540, width: 960, height: 40, ground: true },
  { x: 240, y: 430, width: 210, height: 24 },
  { x: 445, y: 345, width: 200, height: 24 },
  { x: 730, y: 430, width: 190, height: 24 },
];

const ANSWER_POSITIONS = [
  { x: 340, y: 485 },
  { x: 240, y: 394 },
  { x: 445, y: 309 },
  { x: 730, y: 394 },
];

const shuffle = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Phaser.Math.Between(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

class MathPlanetScene extends Phaser.Scene {
  constructor() {
    super("MathPlanet");
    this.score = 0;
    this.levelIndex = 0;
    this.roundIndex = 0;
    this.started = false;
    this.roundActive = false;
    this.touchState = { left: false, right: false, jump: false };
    this.answerChoices = [];
    this.walkClock = 0;
    this.walkFrame = 0;
  }

  preload() {
    this.load.image("explorer-idle", asset(CHARACTER_PATH + "character_purple_idle.png"));
    this.load.image("explorer-walk-a", asset(CHARACTER_PATH + "character_purple_walk_a.png"));
    this.load.image("explorer-walk-b", asset(CHARACTER_PATH + "character_purple_walk_b.png"));
    this.load.image("explorer-jump", asset(CHARACTER_PATH + "character_purple_jump.png"));
    this.load.image("gem", asset(TILE_PATH + "gem_blue.png"));

    this.load.image("bg-forest", asset(BACKGROUND_PATH + "background_color_trees.png"));
    this.load.image("bg-desert", asset(BACKGROUND_PATH + "background_color_desert.png"));
    this.load.image("bg-mushroom", asset(BACKGROUND_PATH + "background_color_mushrooms.png"));
    this.load.image("bg-hills", asset(BACKGROUND_PATH + "background_color_hills.png"));
    this.load.image("bg-trees", asset(BACKGROUND_PATH + "background_fade_trees.png"));
  }

  create() {
    this.background = this.add
      .image(480, 280, levels[0].background)
      .setDisplaySize(960, 560)
      .setDepth(-20);

    this.platformArt = this.add.graphics().setDepth(-4);
    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    this.player = this.physics.add
      .sprite(74, 480, "explorer-idle")
      .setDisplaySize(56, 58)
      .setDepth(5)
      .setCollideWorldBounds(true)
      .setBounce(0);
    this.player.body.setSize(72, 92).setOffset(28, 22);
    this.physics.add.collider(this.player, this.platforms);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      up: "W",
    });

    this.events.on("shutdown", () => this.clearAnswers());
    this.updateHud();
  }

  createPlatforms() {
    PLATFORM_LAYOUT.forEach((platform) => {
      const collider = this.add
        .rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0)
        .setVisible(false);
      this.physics.add.existing(collider, true);
      collider.body.updateFromGameObject();
      this.platforms.add(collider);
    });
    this.drawPlatforms(levels[0].platformColor);
  }

  drawPlatforms(color) {
    this.platformArt.clear();
    PLATFORM_LAYOUT.forEach((platform) => {
      const left = platform.x - platform.width / 2;
      const top = platform.y - platform.height / 2;
      this.platformArt.fillStyle(0x24416f, 0.12);
      this.platformArt.fillRoundedRect(left + 3, top + 8, platform.width, platform.height, 12);
      this.platformArt.fillStyle(color, 1);
      this.platformArt.fillRoundedRect(left, top, platform.width, platform.height, 12);
      this.platformArt.fillStyle(0xffffff, 0.52);
      this.platformArt.fillRoundedRect(left + 4, top + 2, platform.width - 8, 5, 3);
      if (platform.ground) {
        this.platformArt.fillStyle(0x225c61, 0.2);
        this.platformArt.fillRoundedRect(left, top + 15, platform.width, platform.height - 15, 8);
      }
    });
  }

  begin() {
    if (this.started) return;
    this.started = true;
    this.score = 0;
    this.levelIndex = 0;
    this.roundIndex = 0;
    this.touchState = { left: false, right: false, jump: false };
    gameElements.startScreen.hidden = true;
    gameElements.levelClearScreen.hidden = true;
    gameElements.completeScreen.hidden = true;
    this.loadLevel();
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();
  }

  restart() {
    this.started = false;
    this.roundActive = false;
    this.clearAnswers();
    this.begin();
  }

  nextLevel() {
    if (this.levelIndex >= levels.length - 1) return;
    this.levelIndex += 1;
    this.roundIndex = 0;
    this.loadLevel();
  }

  loadLevel() {
    const level = levels[this.levelIndex];
    this.background.setTexture(level.background);
    this.drawPlatforms(level.platformColor);
    this.roundIndex = 0;
    this.player.setPosition(74, 480).setVelocity(0, 0).setTexture("explorer-idle");
    this.loadQuestion();
  }

  loadQuestion() {
    this.clearAnswers();
    const level = levels[this.levelIndex];
    const question = level.questions[this.roundIndex];
    this.currentAnswer = question.answer;
    this.roundActive = true;
    this.player.setPosition(74, 480).setVelocity(0, 0);
    this.updateHud(question.prompt);

    const distractors = [-3, -2, -1, 1, 2, 3]
      .map((offset) => question.answer + offset)
      .filter((answer) => answer > 0);
    const values = shuffle([question.answer, ...shuffle(distractors).slice(0, 3)]);
    const positions = shuffle(ANSWER_POSITIONS);
    const tints = [0x84ddff, 0x97e8c2, 0xffd26f, 0xd0a8ff];

    values.forEach((value, index) => {
      const { x, y } = positions[index];
      const halo = this.add
        .circle(x, y, 32, tints[index], 0.25)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setDepth(2);
      const orb = this.physics.add
        .image(x, y, "gem")
        .setDisplaySize(38, 42)
        .setTint(tints[index])
        .setDepth(3);
      orb.body.setAllowGravity(false);
      orb.body.setImmovable(true);
      orb.body.pushable = false;
      const label = this.add
        .text(x, y + 31, String(value), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#27314d",
          backgroundColor: "#ffffff",
          padding: { left: 12, right: 12, top: 5, bottom: 5 },
        })
        .setOrigin(0.5)
        .setDepth(4);
      const choice = { value, halo, orb, label, collected: false };
      this.answerChoices.push(choice);
      choice.collider = this.physics.add.overlap(this.player, orb, () => this.collectAnswer(choice));
      this.tweens.add({
        targets: [halo, orb, label],
        y: "-=6",
        duration: 760 + index * 80,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    this.setFeedback("碰到答案泡泡來作答", "");
  }

  collectAnswer(choice) {
    if (!this.roundActive || choice.collected) return;
    choice.collected = true;

    if (choice.value === this.currentAnswer) {
      this.roundActive = false;
      this.score += 10;
      this.updateHud();
      this.setFeedback("答對了！＋10 分", "good");
      this.tweens.add({
        targets: [choice.halo, choice.orb, choice.label],
        scale: 0,
        alpha: 0,
        duration: 220,
        ease: "Back.easeIn",
      });
      this.time.delayedCall(850, () => this.finishQuestion());
      return;
    }

    this.score -= 5;
    this.updateHud();
    this.setFeedback("再想一想！－5 分", "try-again");
    this.tweens.add({
      targets: [choice.halo, choice.orb, choice.label],
      alpha: 0,
      scale: 0.6,
      duration: 180,
      onComplete: () => this.destroyChoice(choice),
    });
  }

  finishQuestion() {
    this.clearAnswers();
    this.roundIndex += 1;
    if (this.roundIndex < levels[this.levelIndex].questions.length) {
      this.loadQuestion();
      return;
    }

    this.roundActive = false;
    if (this.levelIndex === levels.length - 1) {
      gameElements.finalScore.textContent = String(this.score);
      gameElements.completeScreen.hidden = false;
      this.setFeedback("任務完成！你是數學小高手。", "good");
      this.updateHud();
      return;
    }

    gameElements.levelClearScreen.hidden = false;
    this.setFeedback("星球任務完成！", "good");
    this.updateHud();
  }

  clearAnswers() {
    this.answerChoices.forEach((choice) => {
      if (choice.collider) this.physics.world.removeCollider(choice.collider);
      this.tweens.killTweensOf([choice.halo, choice.orb, choice.label]);
      choice.halo.destroy();
      choice.orb.destroy();
      choice.label.destroy();
    });
    this.answerChoices = [];
  }

  destroyChoice(choice) {
    if (choice.collider) this.physics.world.removeCollider(choice.collider);
    this.tweens.killTweensOf([choice.halo, choice.orb, choice.label]);
    choice.halo.destroy();
    choice.orb.destroy();
    choice.label.destroy();
  }

  setFeedback(message, kind) {
    gameElements.feedback.textContent = message;
    gameElements.feedback.classList.remove("good", "try-again");
    if (kind) gameElements.feedback.classList.add(kind);
  }

  updateHud(prompt = null) {
    const level = levels[this.levelIndex];
    gameElements.levelLabel.textContent = "第 " + (this.levelIndex + 1) + " 關 · " + level.name;
    gameElements.roundLabel.textContent =
      "第 " + Math.min(this.roundIndex + 1, 3) + " 題 / 3 · " + level.topic;
    if (prompt !== null) gameElements.questionLabel.textContent = prompt;
    gameElements.scoreLabel.textContent = String(this.score);
    const completed = this.levelIndex * 3 + this.roundIndex;
    gameElements.progressFill.style.width = Math.min((completed / 15) * 100, 100) + "%";
    const gameCompleted = this.levelIndex === levels.length - 1 && this.roundIndex >= 3;
    gameElements.levelSteps.forEach((step, index) => {
      step.classList.toggle("active", index === this.levelIndex && !gameCompleted);
      step.classList.toggle("complete", index < this.levelIndex || (gameCompleted && index === this.levelIndex));
    });
  }

  update(_time, delta) {
    if (!this.started) return;

    const left =
      this.cursors.left.isDown || this.keys.left.isDown || this.touchState.left;
    const right =
      this.cursors.right.isDown || this.keys.right.isDown || this.touchState.right;
    const direction = (right ? 1 : 0) - (left ? 1 : 0);
    this.player.setVelocityX(direction * 280);
    if (direction !== 0) this.player.setFlipX(direction < 0);

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      this.touchState.jump;
    this.touchState.jump = false;
    if (jumpPressed && this.player.body.onFloor()) {
      this.player.setVelocityY(-470);
    }

    if (!this.player.body.onFloor()) {
      this.player.setTexture("explorer-jump");
    } else if (direction === 0) {
      this.player.setTexture("explorer-idle");
    } else {
      this.walkClock += delta;
      if (this.walkClock > 135) {
        this.walkClock = 0;
        this.walkFrame = 1 - this.walkFrame;
        this.player.setTexture(this.walkFrame ? "explorer-walk-a" : "explorer-walk-b");
      }
    }
  }
}

export default MathPlanetScene;
