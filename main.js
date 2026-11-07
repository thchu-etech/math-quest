(() => {
  const levels = [
    { question: "8 ＋ 5 ＝？", answer: 13, options: [13, 12, 14, 15], color: 0x68d6ae },
    { question: "17 − 9 ＝？", answer: 8, options: [7, 8, 9, 10], color: 0xffb767 },
    { question: "4 × 3 ＝？", answer: 12, options: [10, 12, 14, 7], color: 0x8b81f4 },
    { question: "24 ÷ 6 ＝？", answer: 4, options: [3, 5, 4, 6], color: 0x55c9dc },
    { question: "7 × 5 − 8 ＝？", answer: 27, options: [25, 29, 27, 35], color: 0xf293b5 },
  ];

  const levelLabel = document.getElementById("level-label");
  const scoreLabel = document.getElementById("score-label");
  const progressFill = document.getElementById("progress-fill");
  const questionLabel = document.getElementById("question-label");
  const introOverlay = document.getElementById("intro-overlay");
  const winOverlay = document.getElementById("win-overlay");
  const finalScore = document.getElementById("final-score");
  const gameRoot = document.getElementById("game-root");

  const drawRounded = (graphics, x, y, width, height, radius, color) => {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x, y, width, height, radius);
  };

  class MathPlanetScene extends Phaser.Scene {
    constructor() {
      super("MathPlanet");
      this.score = 0;
      this.levelIndex = 0;
      this.started = false;
      this.locked = false;
      this.touchState = { left: false, right: false, jump: false };
      this.items = [];
      this.toast = null;
    }

    create() {
      this.makeTextures();
      this.paintWorld();
      this.platforms = this.physics.add.staticGroup();
      [
        [480, 545, 1000, 46],
        [190, 435, 220, 22],
        [470, 365, 205, 22],
        [775, 445, 170, 22],
        [292, 286, 138, 22],
        [706, 252, 142, 22],
      ].forEach(([x, y, width, height], index) => this.addPlatform(x, y, width, height, index));

      this.player = this.physics.add.sprite(82, 492, "explorer");
      this.player.setCollideWorldBounds(true);
      this.player.setBounce(0.05);
      this.player.setGravityY(770);
      this.player.setSize(35, 47).setOffset(8, 5);
      this.physics.add.collider(this.player, this.platforms);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({ left: "A", right: "D", jump: "SPACE", up: "W" });

      this.events.on("shutdown", () => this.clearItems());
      this.events.emit("ready");
    }

    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x5147ba, 1); g.fillRoundedRect(5, 2, 46, 53, 19);
      g.fillStyle(0xffd3a2, 1); g.fillCircle(28, 21, 17);
      g.fillStyle(0x352d43, 1); g.fillCircle(34, 20, 2); g.fillCircle(22, 20, 2);
      g.lineStyle(2, 0x8d4d5b, 1); g.beginPath(); g.arc(28, 25, 6, 0.25, 2.7, false); g.strokePath();
      g.fillStyle(0x765eec, 1); g.fillRoundedRect(9, 36, 38, 18, 9);
      g.fillStyle(0xf5a46b, 1); g.fillRoundedRect(4, 42, 11, 7, 3); g.fillRoundedRect(41, 42, 11, 7, 3);
      g.fillStyle(0xffd66e, 1); g.fillRoundedRect(16, 50, 12, 6, 3); g.fillRoundedRect(31, 50, 12, 6, 3);
      g.generateTexture("explorer", 56, 58); g.destroy();
    }

    paintWorld() {
      if (this.worldArt) this.worldArt.destroy();
      const art = this.add.graphics();
      art.fillGradientStyle(0xdff6f3, 0xdff6f3, 0xf0f2ff, 0xf0f2ff, 1);
      art.fillRect(0, 0, 960, 560);
      // Soft clouds and distant hills add depth while keeping answer bubbles easy to spot.
      [[128, 94, 1], [435, 139, 0.72], [800, 93, 0.88]].forEach(([x, y, s]) => {
        art.fillStyle(0xffffff, 0.64);
        art.fillEllipse(x, y + 9 * s, 64 * s, 18 * s); art.fillCircle(x - 13 * s, y + 1 * s, 13 * s); art.fillCircle(x + 3 * s, y - 3 * s, 16 * s); art.fillCircle(x + 19 * s, y + 2 * s, 11 * s);
      });
      art.fillStyle(0xccece1, 0.82); art.fillEllipse(145, 529, 390, 95); art.fillEllipse(850, 533, 460, 112);
      art.fillStyle(0xb6e4d3, 0.75); art.fillEllipse(525, 548, 500, 88);
      art.fillStyle(0x97d9bd, 1); art.fillRect(0, 523, 960, 37);
      art.fillStyle(0x80cba9, 1); art.fillRoundedRect(0, 520, 960, 7, 4);
      for (let x = 22; x < 960; x += 36) {
        art.fillStyle(x % 2 ? 0xb6e9d1 : 0xa8e1c7, 0.68);
        art.fillCircle(x, 539 + (x % 3) * 4, 2);
      }
      // Tiny decorative stars.
      [[255, 92], [660, 112], [884, 183], [82, 305], [544, 218]].forEach(([x, y], i) => {
        art.fillStyle(i % 2 ? 0xffc86e : 0xaaa1f4, 0.76); art.fillCircle(x, y, i % 2 ? 3 : 2);
      });
      art.setDepth(-5);
      this.worldArt = art;
    }

    addPlatform(x, y, width, height, index) {
      const shadow = this.add.rectangle(x + 2, y + 11, width, height, 0x7fbda9, 0.16).setDepth(1);
      const base = this.add.rectangle(x, y + 4, width, height, index === 0 ? 0x87cfb1 : 0x8ad7bc).setDepth(2);
      base.setStrokeStyle(1, 0xffffff, 0.58);
      const cap = this.add.rectangle(x, y - 5, width, 11, index === 0 ? 0x67c89f : 0x70cfa9).setDepth(3);
      cap.setStrokeStyle(1, 0xffffff, 0.62);
      this.physics.add.existing(shadow, true);
      // Invisible collider is separate so the art can have rounded, layered edges.
      const collider = this.add.rectangle(x, y, width, 16, 0x000000, 0).setVisible(false);
      this.physics.add.existing(collider, true);
      collider.body.updateFromGameObject();
      this.platforms.add(collider);
    }

    begin() {
      if (this.started) return;
      this.started = true;
      this.score = 0;
      this.levelIndex = 0;
      this.player.setPosition(82, 492);
      this.player.setVelocity(0, 0);
      this.updateHud();
      this.loadLevel();
      this.game.canvas.focus();
    }

    restart() {
      this.started = false;
      this.locked = false;
      this.clearItems();
      this.player.setPosition(82, 492);
      this.player.setVelocity(0, 0);
      this.begin();
    }

    updateHud() {
      levelLabel.innerHTML = `第 ${Math.min(this.levelIndex + 1, 5)} 關 <span>/ 5</span>`;
      scoreLabel.innerHTML = `${this.score} <small>分</small>`;
      progressFill.style.width = `${(this.levelIndex / levels.length) * 100}%`;
      if (this.levelIndex < levels.length) questionLabel.textContent = levels[this.levelIndex].question;
    }

    loadLevel() {
      this.locked = false;
      this.clearItems();
      this.updateHud();
      this.player.setPosition(this.levelIndex % 2 ? 875 : 82, 492);
      this.player.setVelocity(0, 0);
      const level = levels[this.levelIndex];
      const spots = [
        [135, 490], [307, 389], [480, 320], [654, 490], [776, 405], [292, 242], [706, 207], [886, 490],
      ];
      const chosen = [spots[this.levelIndex], spots[(this.levelIndex + 2) % spots.length], spots[(this.levelIndex + 4) % spots.length], spots[(this.levelIndex + 6) % spots.length]];
      level.options.forEach((value, index) => {
        const [x, y] = chosen[index];
        this.createAnswer(x, y, value, value === level.answer, index, level.color);
      });
      this.showToast(`第 ${this.levelIndex + 1} 關，出發！`, 0x6253d6);
    }

    createAnswer(x, y, value, correct, index, accent) {
      const palette = correct ? accent : [0xffbd68, 0x9c91ed, 0x67cde0][(index + this.levelIndex) % 3];
      const bubble = this.add.container(x, y).setDepth(8);
      const aura = this.add.circle(0, 0, 29, palette, 0.12);
      const outer = this.add.circle(0, 0, 22, 0xffffff, 0.9).setStrokeStyle(2, palette, 0.92);
      const inner = this.add.circle(0, 0, 17, palette, 0.95);
      const label = this.add.text(0, 0, String(value), {
        fontFamily: '"PingFang TC", "Microsoft JhengHei", sans-serif', fontSize: value > 9 ? "14px" : "16px", fontStyle: "800", color: "#ffffff",
      }).setOrigin(0.5);
      bubble.add([aura, outer, inner, label]);
      bubble.setData({ value, correct, baseY: y, phase: Math.random() * Math.PI * 2, collected: false });
      this.items.push(bubble);
      this.tweens.add({ targets: bubble, scaleX: 1.05, scaleY: 1.05, duration: 760 + index * 65, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    clearItems() {
      if (this.items) this.items.forEach((item) => { if (item && item.active) item.destroy(); });
      this.items = [];
    }

    showToast(message, color = 0x5544bd) {
      if (this.toast) this.toast.destroy();
      const toast = this.add.text(480, 34, message, {
        fontFamily: '"Noto Sans TC", sans-serif', fontSize: "15px", fontStyle: "800", color: "#ffffff",
        backgroundColor: `#${color.toString(16).padStart(6, "0")}`, padding: { x: 14, y: 8 },
      }).setOrigin(0.5, 0).setDepth(20).setAlpha(0);
      this.toast = toast;
      this.tweens.add({ targets: toast, alpha: 1, y: 44, duration: 160, yoyo: true, hold: 780, onComplete: () => {
        if (this.toast === toast) this.toast = null;
        if (toast.active) toast.destroy();
      } });
    }

    collect(item) {
      if (this.locked || item.getData("collected")) return;
      item.setData("collected", true);
      if (item.getData("correct")) {
        this.score += 10;
        this.locked = true;
        item.destroy();
        this.showToast("答對了！＋10 分 ✨", 0x34ae83);
        scoreLabel.innerHTML = `${this.score} <small>分</small>`;
        progressFill.style.width = `${((this.levelIndex + 1) / levels.length) * 100}%`;
        this.time.delayedCall(1150, () => {
          this.levelIndex += 1;
          if (this.levelIndex >= levels.length) this.finish();
          else this.loadLevel();
        });
      } else {
        this.score -= 5;
        scoreLabel.innerHTML = `${this.score} <small>分</small>`;
        this.showToast("再想一想！－5 分", 0xe78570);
        this.tweens.add({ targets: item, alpha: 0, scale: 0.4, duration: 180, onComplete: () => item.destroy() });
      }
    }

    finish() {
      this.locked = true;
      this.started = false;
      this.levelIndex = levels.length;
      levelLabel.innerHTML = "完成！ <span>/ 5</span>";
      progressFill.style.width = "100%";
      questionLabel.textContent = "五關挑戰完成，太棒了！";
      finalScore.textContent = this.score;
      winOverlay.hidden = false;
    }

    update(time, delta) {
      if (!this.player) return;
      if (!this.started) {
        this.player.setVelocityX(0);
        return;
      }
      const left = this.cursors.left.isDown || this.keys.left.isDown || this.touchState.left;
      const right = this.cursors.right.isDown || this.keys.right.isDown || this.touchState.right;
      const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.jump) || Phaser.Input.Keyboard.JustDown(this.keys.up) || this.touchState.jump;
      const speed = 220;
      this.player.setVelocityX(left ? -speed : right ? speed : 0);
      if (jumpPressed && this.player.body.blocked.down) this.player.setVelocityY(-485);
      this.touchState.jump = false;

      if (this.player.y > 580) {
        this.player.setPosition(this.levelIndex % 2 ? 875 : 82, 475);
        this.player.setVelocity(0, 0);
      }
      this.items.forEach((item) => {
        if (!item.active || item.getData("collected")) return;
        const phase = item.getData("phase");
        const baseY = item.getData("baseY");
        item.y = baseY + Math.sin(time / 320 + phase) * 5;
        const dx = this.player.x - item.x;
        const dy = this.player.y - item.y;
        if (dx * dx + dy * dy < 42 * 42) this.collect(item);
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 560,
    parent: "game-root",
    backgroundColor: "#dff6f3",
    render: { antialias: true, pixelArt: false },
    physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 560 },
    scene: [MathPlanetScene],
  });

  let scene = null;
  const registeredScene = game.scene.getScene("MathPlanet");
  registeredScene.events.once("ready", () => { scene = registeredScene; });
  document.getElementById("start-button").addEventListener("click", () => {
    introOverlay.hidden = true;
    if (scene) scene.begin();
  });
  document.getElementById("restart-button").addEventListener("click", () => {
    winOverlay.hidden = true;
    if (scene) scene.restart();
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const press = (event) => {
      event.preventDefault();
      if (!scene) return;
      if (control === "jump") scene.touchState.jump = true;
      else scene.touchState[control] = true;
    };
    const release = () => { if (scene && control !== "jump") scene.touchState[control] = false; };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });
})();
