/* =========================================================================
   NEON CLASH — escenas (Boot, Menú y Combate)
   ========================================================================= */
'use strict';

/* -------------------------------------------------------------------------
   Utilidades de texturas generadas en tiempo de ejecución
   ------------------------------------------------------------------------- */
function makeRadialTexture(scene, key, size, inner, outer) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

function createRuntimeTextures(scene) {
  makeRadialTexture(scene, 'spark', 48, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  makeRadialTexture(scene, 'glow', 256, 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  makeRadialTexture(scene, 'energy', 96, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  makeRadialTexture(scene, 'dust', 32, 'rgba(210,220,240,0.8)', 'rgba(210,220,240,0)');

  // sombra elíptica
  if (!scene.textures.exists('shadow')) {
    const tex = scene.textures.createCanvas('shadow', 160, 44);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(80, 22, 2, 80, 22, 78);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.scale(1, 0.28);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 160, 160);
    ctx.restore();
    tex.refresh();
  }

  // gota de lluvia
  if (!scene.textures.exists('rain')) {
    const tex = scene.textures.createCanvas('rain', 4, 42);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 42);
    g.addColorStop(0, 'rgba(150,220,255,0)');
    g.addColorStop(0.5, 'rgba(180,235,255,0.55)');
    g.addColorStop(1, 'rgba(180,235,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 42);
    tex.refresh();
  }

  // anillo
  if (!scene.textures.exists('ring')) {
    const tex = scene.textures.createCanvas('ring', 128, 128);
    const ctx = tex.getContext();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
  }

  // píxel
  if (!scene.textures.exists('pixel')) {
    const tex = scene.textures.createCanvas('pixel', 4, 4);
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
    tex.refresh();
  }
}

function createFighterAnims(scene) {
  const defs = {
    idle: { frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
    walk: { frames: [4, 5, 6, 7, 8, 9], frameRate: 12, repeat: -1 },
    jump: { frames: [10, 11], frameRate: 7, repeat: -1 },
    crouch: { frames: [12, 13], frameRate: 6, repeat: -1 },
    punch: { frames: [14, 15, 16], frameRate: 18, repeat: 0 },
    kick: { frames: [17, 18, 19, 20], frameRate: 14, repeat: 0 },
    block: { frames: [21, 22], frameRate: 7, repeat: -1 },
    hurt: { frames: [23, 24], frameRate: 10, repeat: 0 },
    ko: { frames: [25], frameRate: 1, repeat: 0 },
    special: { frames: [26, 27, 28, 29], frameRate: 11, repeat: 0 },
    win: { frames: [30, 31], frameRate: 6, repeat: -1 },
  };

  ['kai', 'raze'].forEach((prefix) => {
    Object.keys(defs).forEach((name) => {
      const d = defs[name];
      const key = prefix + '-' + name;
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(prefix, { frames: d.frames }),
        frameRate: d.frameRate,
        repeat: d.repeat,
      });
    });
  });
}

/* =========================================================================
   BOOT
   ========================================================================= */
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const w = NC.W;
    const h = NC.H;

    this.cameras.main.setBackgroundColor('#05060f');
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x22e6ff, 0.05);
    for (let x = 0; x < w; x += 48) grid.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) grid.lineBetween(0, y, w, y);

    this.add.text(w / 2, h / 2 - 110, 'NEON CLASH', {
      ...NC.textStyle(58, NC.CSS.white, '900'),
      letterSpacing: 10,
    }).setOrigin(0.5).setShadow(0, 0, NC.CSS.cyan, 26, true, true);

    this.add.text(w / 2, h / 2 - 55, 'CARGANDO SISTEMA DE COMBATE', NC.bodyStyle(18, NC.CSS.muted, '600'))
      .setOrigin(0.5);

    const bx = w / 2 - 260;
    const by = h / 2 + 18;
    const bg = this.add.graphics();
    bg.fillStyle(0x0b1120, 0.9);
    bg.fillRect(bx, by, 520, 10);
    bg.lineStyle(1, 0x22e6ff, 0.35);
    bg.strokeRect(bx - 1, by - 1, 522, 12);

    const fill = this.add.graphics();
    const pct = this.add.text(w / 2, h / 2 + 50, '0%', NC.textStyle(16, NC.CSS.cyan, '700')).setOrigin(0.5);

    this.load.on('progress', (v) => {
      fill.clear();
      fill.fillStyle(0x22e6ff, 0.9);
      fill.fillRect(bx, by, 520 * v, 10);
      fill.fillStyle(0xffffff, 0.8);
      fill.fillRect(bx, by, 520 * v, 2);
      pct.setText(Math.round(v * 100) + '%');
    });

    this.load.on('loaderror', (file) => {
      console.error('[NEON CLASH] No se pudo cargar:', file.key, file.src);
    });

    this.load.image('bg', 'assets/backgrounds/neon-rooftop.png');
    this.load.spritesheet('kai', 'assets/sprites/kai.png', { frameWidth: 160, frameHeight: 160 });
    this.load.spritesheet('raze', 'assets/sprites/raze.png', { frameWidth: 160, frameHeight: 160 });
    this.load.image('portrait-kai', 'assets/sprites/portrait-kai.png');
    this.load.image('portrait-raze', 'assets/sprites/portrait-raze.png');

    this.load.audio('music', 'assets/audio/music.wav');
    this.load.audio('punch', 'assets/audio/punch.wav');
    this.load.audio('kick', 'assets/audio/kick.wav');
    this.load.audio('hit', 'assets/audio/hit.wav');
    this.load.audio('block', 'assets/audio/block.wav');
    this.load.audio('jump', 'assets/audio/jump.wav');
    this.load.audio('special', 'assets/audio/special.wav');
    this.load.audio('ko', 'assets/audio/ko.wav');
    this.load.audio('round', 'assets/audio/round.wav');
    this.load.audio('select', 'assets/audio/select.wav');
    this.load.audio('win', 'assets/audio/win.wav');
  }

  create() {
    createRuntimeTextures(this);
    createFighterAnims(this);

    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('is-hidden');
      setTimeout(() => loading.remove(), 700);
    }

    this.time.delayedCall(260, () => this.scene.start('MenuScene'));
  }
}

/* =========================================================================
   MENÚ
   ========================================================================= */
class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.selected = 0;
    this.difficultyKey = 'normal';
    this.difficultyKeys = ['facil', 'normal', 'dificil'];
    this.controlsOpen = false;
    this.starting = false;

    NCAudio.attach(this);

    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(0).setAlpha(0.8).setTint(0x9aa6c8);
    this.add.rectangle(0, 0, NC.W, NC.H, 0x05060f, 0.38).setOrigin(0).setDepth(1);

    // marco neón
    const frame = this.add.graphics().setDepth(2);
    frame.lineStyle(2, 0x22e6ff, 0.55);
    frame.strokeRect(22, 22, NC.W - 44, NC.H - 44);
    frame.lineStyle(1, 0xff3c8c, 0.35);
    frame.strokeRect(30, 30, NC.W - 60, NC.H - 60);
    frame.fillStyle(0x22e6ff, 0.65);
    frame.fillRect(22, 22, 110, 3);
    frame.fillRect(NC.W - 132, NC.H - 25, 110, 3);
    frame.fillStyle(0xff3c8c, 0.65);
    frame.fillRect(NC.W - 132, 22, 110, 3);
    frame.fillRect(22, NC.H - 25, 110, 3);

    // lluvia y partículas
    this.add.particles(0, 0, 'rain', {
      x: { min: -40, max: NC.W + 40 },
      y: -30,
      lifespan: 1500,
      speedY: { min: 650, max: 1050 },
      speedX: { min: -90, max: -30 },
      scale: { start: 0.7, end: 0.25 },
      alpha: { start: 0.28, end: 0 },
      quantity: 2,
      frequency: 28,
      blendMode: 'ADD',
    }).setDepth(4);

    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: NC.W },
      y: NC.H + 20,
      lifespan: 5200,
      speedY: { min: -18, max: -52 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.18, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [0x22e6ff, 0xff3c8c],
      quantity: 1,
      frequency: 120,
      blendMode: 'ADD',
    }).setDepth(4);

    this.createTitle();
    this.createPortraits();
    this.createMenu();
    this.createControlsPanel();
    this.createFooter();

    // desbloqueo de audio
    const unlock = () => {
      NCAudio.unlockAndStart();
      if (this.audioHint) this.audioHint.setVisible(false);
    };
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);

    this.input.keyboard.on('keydown-M', () => {
      const muted = NCAudio.toggleMute();
      this.showToast(muted ? 'AUDIO SILENCIADO' : 'AUDIO ACTIVADO', NC.CSS.yellow);
    });
    this.input.keyboard.on('keydown-F', () => this.scale.toggleFullscreen());

    this.menuKeys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,ENTER,SPACE,ESC,H');

    this.cameras.main.fadeIn(450, 5, 6, 15);
  }

  createTitle() {
    const title = this.add.text(NC.W / 2, 92, 'NEON', {
      ...NC.textStyle(84, NC.CSS.white, '900'),
      letterSpacing: 18,
    }).setOrigin(0.5).setDepth(10);
    title.setShadow(0, 0, NC.CSS.cyan, 30, true, true);

    const title2 = this.add.text(NC.W / 2, 176, 'CLASH', {
      ...NC.textStyle(100, NC.CSS.white, '900'),
      letterSpacing: 14,
    }).setOrigin(0.5).setDepth(10);
    title2.setShadow(0, 0, NC.CSS.magenta, 32, true, true);

    this.tweens.add({
      targets: [title, title2],
      y: '-=4',
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const line = this.add.graphics().setDepth(10);
    line.fillStyle(0x22e6ff, 0.8);
    line.fillRect(NC.W / 2 - 250, 235, 170, 2);
    line.fillStyle(0xff3c8c, 0.8);
    line.fillRect(NC.W / 2 + 80, 235, 170, 2);
    line.fillStyle(0xffffff, 0.6);
    line.fillRect(NC.W / 2 - 10, 234, 20, 4);

    this.add.text(NC.W / 2, 255, 'CYBER FIGHTING  //  ISWD823', NC.bodyStyle(16, NC.CSS.muted, '600'))
      .setOrigin(0.5)
      .setDepth(10)
      .setLetterSpacing(3);
  }

  createPortraits() {
    const makeSide = (x, key, accent, name, sub, flip) => {
      const ring = this.add.image(x, 388, 'ring')
        .setTint(accent).setAlpha(0.14).setScale(2.05).setDepth(6);
      this.tweens.add({ targets: ring, angle: flip ? -360 : 360, duration: 26000, repeat: -1 });

      this.add.image(x, 388, 'glow')
        .setTint(accent).setAlpha(0.18).setScale(1.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(6);

      const portrait = this.add.image(x, 388, key)
        .setDisplaySize(230, 230)
        .setDepth(8);
      this.tweens.add({
        targets: portrait,
        y: 380,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const g = this.add.graphics().setDepth(9);
      g.lineStyle(2, accent, 0.9);
      g.strokeRect(x - 119, 269, 238, 238);
      g.lineStyle(1, accent, 0.35);
      g.strokeRect(x - 111, 277, 222, 222);
      g.fillStyle(accent, 0.9);
      g.fillRect(x - 119, 269, 42, 3);
      g.fillRect(x + 77, 504, 42, 3);
      // esquinas
      g.lineStyle(3, accent, 0.95);
      g.lineBetween(x - 119, 269, x - 96, 269);
      g.lineBetween(x - 119, 269, x - 119, 292);
      g.lineBetween(x + 119, 269, x + 96, 269);
      g.lineBetween(x + 119, 269, x + 119, 292);
      g.lineBetween(x - 119, 507, x - 96, 507);
      g.lineBetween(x - 119, 507, x - 119, 484);
      g.lineBetween(x + 119, 507, x + 96, 507);
      g.lineBetween(x + 119, 507, x + 119, 484);

      this.add.text(x, 532, name, NC.textStyle(30, NC.CSS.white, '900')).setOrigin(0.5).setDepth(10);
      this.add.text(x, 562, sub, NC.bodyStyle(14, NC.CSS.muted, '600')).setOrigin(0.5).setDepth(10).setLetterSpacing(2);
    };

    makeSide(190, 'portrait-kai', NC.COLORS.cyan, 'KAI', 'NINJA DE NEÓN', false);
    makeSide(1090, 'portrait-raze', NC.COLORS.magenta, 'RAZE', 'FUGITIVO DEL SECTOR 07', true);
  }

  createMenu() {
    this.menuData = [
      { label: '1 JUGADOR', mode: '1p' },
      { label: '2 JUGADORES', mode: '2p' },
      { label: 'CONTROLES', mode: null },
    ];

    this.menuTexts = this.menuData.map((item, i) => {
      const t = this.add.text(NC.W / 2, 345 + i * 58, item.label, {
        ...NC.textStyle(28, NC.CSS.muted, '700'),
        letterSpacing: 4,
      }).setOrigin(0.5).setDepth(12);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        if (!this.controlsOpen) this.setSelection(i);
      });
      t.on('pointerdown', () => {
        if (this.controlsOpen) return;
        this.setSelection(i);
        this.activate();
      });
      return t;
    });

    this.selector = this.add.graphics().setDepth(11);

    this.diffLabel = this.add.text(NC.W / 2, 530, 'DIFICULTAD', NC.bodyStyle(15, NC.CSS.muted, '600'))
      .setOrigin(0.5).setDepth(12).setLetterSpacing(3);
    this.diffText = this.add.text(NC.W / 2, 556, '‹  NORMAL  ›', NC.textStyle(22, NC.CSS.white, '700'))
      .setOrigin(0.5).setDepth(12).setLetterSpacing(2);
    this.diffHint = this.add.text(NC.W / 2, 582, '←  →  CAMBIAR', NC.bodyStyle(13, NC.CSS.muted, '600'))
      .setOrigin(0.5).setDepth(12);

    this.audioHint = this.add.text(NC.W / 2, 630, 'CLICK O PULSA UNA TECLA PARA ACTIVAR EL AUDIO', NC.bodyStyle(14, NC.CSS.cyan, '600'))
      .setOrigin(0.5).setDepth(12).setAlpha(0.8);
    this.tweens.add({ targets: this.audioHint, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1 });

    this.setSelection(0);
  }

  createControlsPanel() {
    this.controlsBackdrop = this.add.rectangle(0, 0, NC.W, NC.H, 0x02030a, 0.82)
      .setOrigin(0).setDepth(190).setVisible(false).setInteractive();
    this.controlsBackdrop.on('pointerdown', () => this.closeControls());

    this.controlsPanel = this.add.container(NC.W / 2, NC.H / 2).setDepth(200).setVisible(false).setAlpha(0);

    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.98);
    panel.fillRoundedRect(-470, -280, 940, 560, 12);
    panel.lineStyle(2, 0x22e6ff, 0.8);
    panel.strokeRoundedRect(-470, -280, 940, 560, 12);
    panel.lineStyle(1, 0xff3c8c, 0.4);
    panel.strokeRoundedRect(-460, -270, 920, 540, 9);
    panel.fillStyle(0x22e6ff, 0.8);
    panel.fillRect(-470, -280, 190, 3);
    panel.fillStyle(0xff3c8c, 0.8);
    panel.fillRect(280, 277, 190, 3);
    this.controlsPanel.add(panel);

    const title = this.add.text(0, -232, 'CONTROLES', NC.textStyle(40, NC.CSS.white, '900')).setOrigin(0.5);
    title.setShadow(0, 0, NC.CSS.cyan, 18, true, true);
    this.controlsPanel.add(title);

    const addColumn = (cx, heading, accent, rows) => {
      const h = this.add.text(cx, -176, heading, NC.textStyle(20, accent, '700')).setOrigin(0.5).setLetterSpacing(3);
      this.controlsPanel.add(h);
      rows.forEach((row, i) => {
        const y = -132 + i * 42;
        const k = this.add.text(cx - 175, y, row[0], NC.bodyStyle(20, NC.CSS.muted, '600'));
        const v = this.add.text(cx + 175, y, row[1], NC.textStyle(16, NC.CSS.white, '500')).setOrigin(1, 0);
        this.controlsPanel.add([k, v]);
      });
    };

    addColumn(-225, 'JUGADOR 1', NC.CSS.cyan, NC.CONTROLS_P1);
    addColumn(225, 'JUGADOR 2', NC.CSS.magenta, NC.CONTROLS_P2);

    const alt = this.add.text(0, 165, 'EN 1 JUGADOR, P1 TAMBIÉN PUEDE USAR ← → ↑ ↓', NC.bodyStyle(14, NC.CSS.muted, '600')).setOrigin(0.5);
    const note = this.add.text(0, 205, 'P / ESC — PAUSA     ·     M — SILENCIO     ·     F — PANTALLA COMPLETA', NC.bodyStyle(15, NC.CSS.muted, '600')).setOrigin(0.5);
    const close = this.add.text(0, 240, 'H / ESC — VOLVER', NC.textStyle(16, NC.CSS.yellow, '700')).setOrigin(0.5);
    this.controlsPanel.add([alt, note, close]);
  }

  createFooter() {
    this.add.text(46, NC.H - 54, 'PHASER 3  ·  2026', NC.bodyStyle(14, NC.CSS.muted, '600'))
      .setDepth(12).setLetterSpacing(2);
    this.add.text(NC.W - 46, NC.H - 54, 'KEVIN LLUGCHA', NC.bodyStyle(14, NC.CSS.muted, '600'))
      .setOrigin(1, 0).setDepth(12).setLetterSpacing(2);
    this.add.text(NC.W / 2, NC.H - 54, 'M: SILENCIO  ·  F: PANTALLA COMPLETA', NC.bodyStyle(13, NC.CSS.muted, '600'))
      .setOrigin(0.5).setDepth(12).setAlpha(0.65);
  }

  setSelection(i) {
    if (this.controlsOpen) return;
    this.selected = i;
    this.menuTexts.forEach((t, idx) => {
      const active = idx === i;
      t.setColor(active ? NC.CSS.white : NC.CSS.muted);
      t.setScale(active ? 1.06 : 1);
      t.setShadow(active ? 0 : 0, 0, active ? (i === 1 ? NC.CSS.magenta : NC.CSS.cyan) : '#000000', active ? 18 : 0, true, true);
    });
    this.redrawSelector();

    const is1p = i === 0;
    this.diffLabel.setAlpha(is1p ? 1 : 0.35);
    this.diffText.setAlpha(is1p ? 1 : 0.35);
    this.diffHint.setAlpha(is1p ? 1 : 0.35);
  }

  redrawSelector() {
    const t = this.menuTexts[this.selected];
    const y = t.y;
    const half = t.width / 2 + 26;
    const g = this.selector;
    g.clear();
    const color = this.selected === 1 ? NC.COLORS.magenta : NC.COLORS.cyan;
    g.lineStyle(2, color, 0.9);
    g.lineBetween(NC.W / 2 - half - 20, y, NC.W / 2 - half, y);
    g.lineBetween(NC.W / 2 + half, y, NC.W / 2 + half + 20, y);
    g.lineBetween(NC.W / 2 - half - 20, y - 6, NC.W / 2 - half - 20, y + 6);
    g.lineBetween(NC.W / 2 + half + 20, y - 6, NC.W / 2 + half + 20, y + 6);
    g.lineStyle(1, color, 0.35);
    g.lineBetween(NC.W / 2 - half, y + 22, NC.W / 2 + half, y + 22);
  }

  changeDifficulty(dir) {
    if (this.selected !== 0) return;
    let idx = this.difficultyKeys.indexOf(this.difficultyKey);
    idx = (idx + dir + this.difficultyKeys.length) % this.difficultyKeys.length;
    this.difficultyKey = this.difficultyKeys[idx];
    const label = NC.DIFFICULTY[this.difficultyKey].label;
    this.diffText.setText('‹  ' + label + '  ›');
    NCAudio.play('select', 0.35);
    this.tweens.add({ targets: this.diffText, scale: 1.12, duration: 90, yoyo: true });
  }

  activate() {
    if (this.starting || this.controlsOpen) return;
    if (this.selected === 2) {
      this.openControls();
      return;
    }
    NCAudio.play('select', 0.5);
    this.starting = true;
    const mode = this.selected === 0 ? '1p' : '2p';
    this.cameras.main.flash(140, 34, 230, 255);
    this.time.delayedCall(180, () => {
      this.scene.start('FightScene', { mode, difficulty: this.difficultyKey });
    });
  }

  openControls() {
    if (this.controlsOpen) return;
    this.controlsOpen = true;
    this.controlsBackdrop.setVisible(true).setAlpha(0);
    this.controlsPanel.setVisible(true).setAlpha(0).setScale(0.96);
    this.tweens.add({ targets: this.controlsBackdrop, alpha: 1, duration: 160 });
    this.tweens.add({ targets: this.controlsPanel, alpha: 1, scale: 1, duration: 200, ease: 'Back.easeOut' });
    NCAudio.play('select', 0.4);
  }

  closeControls() {
    if (!this.controlsOpen) return;
    this.controlsOpen = false;
    this.tweens.add({
      targets: this.controlsPanel,
      alpha: 0,
      scale: 0.97,
      duration: 140,
      onComplete: () => this.controlsPanel.setVisible(false),
    });
    this.tweens.add({
      targets: this.controlsBackdrop,
      alpha: 0,
      duration: 140,
      onComplete: () => this.controlsBackdrop.setVisible(false),
    });
    NCAudio.play('select', 0.3);
  }

  showToast(text, color) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = this.add.text(NC.W / 2, 645, text, NC.textStyle(15, color, '700'))
      .setOrigin(0.5).setDepth(180).setAlpha(0);
    this.tweens.add({
      targets: this.toastText,
      alpha: 1,
      y: 635,
      duration: 180,
      hold: 900,
      yoyo: true,
      onComplete: () => {
        if (this.toastText) this.toastText.destroy();
        this.toastText = null;
      },
    });
  }

  update() {
    const kb = this.menuKeys;
    const up = Phaser.Input.Keyboard.JustDown(kb.UP);
    const down = Phaser.Input.Keyboard.JustDown(kb.DOWN);
    const left = Phaser.Input.Keyboard.JustDown(kb.LEFT);
    const right = Phaser.Input.Keyboard.JustDown(kb.RIGHT);
    const enter = Phaser.Input.Keyboard.JustDown(kb.ENTER);
    const space = Phaser.Input.Keyboard.JustDown(kb.SPACE);
    const esc = Phaser.Input.Keyboard.JustDown(kb.ESC);
    const h = Phaser.Input.Keyboard.JustDown(kb.H);

    if (this.controlsOpen) {
      if (esc || h) this.closeControls();
      return;
    }

    if (up || down) {
      const dir = up ? -1 : 1;
      this.setSelection((this.selected + dir + this.menuData.length) % this.menuData.length);
      NCAudio.play('select', 0.3);
    }
    if (left || right) {
      this.changeDifficulty(left ? -1 : 1);
    }
    if (enter || space) {
      this.activate();
    }
    if (h) {
      this.openControls();
    }
    if (esc) {
      // sin acción en el menú
    }
  }
}

/* =========================================================================
   COMBATE
   ========================================================================= */
class FightScene extends Phaser.Scene {
  constructor() {
    super('FightScene');
  }

  init(data) {
    this.mode = data && data.mode ? data.mode : '1p';
    this.difficultyKey = data && data.difficulty ? data.difficulty : 'normal';
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.roundState = 'intro';
    this.roundResolved = false;
    this.matchOver = false;
    this.paused = false;
    this.timeLeft = NC.ROUND_TIME;
    this.p1Trail = 1;
    this.p2Trail = 1;
    this.comboP1 = 0;
    this.comboP2 = 0;
    this.lastHitP1 = -9999;
    this.lastHitP2 = -9999;
    this.hitStopping = false;
    this.projectiles = [];
    this.touchInput = null;
    this.toastText = null;
    this.currentAnnouncement = null;
  }

  create() {
    this.cameras.main.setBackgroundColor('#05060f');
    NCAudio.attach(this);
    NCAudio.startMusic();

    this.add.image(0, 0, 'bg').setOrigin(0).setDepth(0);

    // viñeta de combate
    this.add.rectangle(0, 0, NC.W, 150, 0x05060f, 0.42).setOrigin(0).setDepth(1);
    this.add.rectangle(0, 560, NC.W, 160, 0x05060f, 0.16).setOrigin(0).setDepth(1);

    this.add.particles(0, 0, 'rain', {
      x: { min: -40, max: NC.W + 40 },
      y: -30,
      lifespan: 1300,
      speedY: { min: 700, max: 1100 },
      speedX: { min: -100, max: -40 },
      scale: { start: 0.8, end: 0.3 },
      alpha: { start: 0.3, end: 0 },
      quantity: 3,
      frequency: 24,
      blendMode: 'ADD',
    }).setDepth(5);

    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: NC.W },
      y: NC.H + 10,
      lifespan: 5000,
      speedY: { min: -14, max: -45 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.16, end: 0 },
      alpha: { start: 0.4, end: 0 },
      tint: [0x22e6ff, 0xff3c8c],
      quantity: 1,
      frequency: 160,
      blendMode: 'ADD',
    }).setDepth(5);

    this.physics.world.setBounds(60, 0, NC.W - 120, NC.FLOOR);

    this.p1 = new Fighter(this, {
      key: 'kai',
      displayName: 'KAI',
      x: 380,
      facing: 1,
      accent: NC.COLORS.cyan,
      accentCss: NC.CSS.cyan,
      isCPU: false,
    });
    this.p2 = new Fighter(this, {
      key: 'raze',
      displayName: 'RAZE',
      x: 900,
      facing: -1,
      accent: NC.COLORS.magenta,
      accentCss: NC.CSS.magenta,
      isCPU: this.mode === '1p',
    });

    this.physics.add.collider(this.p1.sprite, this.p2.sprite);
    this.ai = this.mode === '1p' ? new AIController(this.p2, this.p1, this.difficultyKey) : null;

    this.createHUD();
    this.createInput();
    this.createTouchControls();
    this.createPauseOverlay();
    this.createMatchEndOverlay();

    this.p1Trail = 1;
    this.p2Trail = 1;

    this.cameras.main.fadeIn(350, 5, 6, 15);
    this.time.delayedCall(420, () => this.startRound());

    const hint = this.mode === '1p'
      ? 'A / D  MOVER   ·   W  SALTAR   ·   J  PUÑO   ·   K  PATADA   ·   L  BLOQUEAR   ·   U  ESPECIAL'
      : 'P1: A/D · W · J/K/L/U        P2: ←/→ · ↑ · 1/2/3/4';
    if (!this.touchInput) {
      this.hintText = this.add.text(NC.W / 2, NC.H - 28, hint, NC.bodyStyle(14, NC.CSS.muted, '600'))
        .setOrigin(0.5).setDepth(120).setAlpha(0.75);
      this.tweens.add({
        targets: this.hintText,
        alpha: 0,
        delay: 7000,
        duration: 900,
        onComplete: () => this.hintText.destroy(),
      });
    }
  }

  /* ----------------------------- HUD ----------------------------- */
  createHUD() {
    this.add.rectangle(0, 0, NC.W, 140, 0x05060f, 0.62).setOrigin(0).setDepth(90);
    const line = this.add.graphics().setDepth(91);
    line.fillStyle(0x22e6ff, 0.65);
    line.fillRect(0, 138, NC.W / 2, 2);
    line.fillStyle(0xff3c8c, 0.65);
    line.fillRect(NC.W / 2, 138, NC.W / 2, 2);

    this.hudStatic = this.add.graphics().setDepth(100);
    this.hudGraphics = this.add.graphics().setDepth(100);

    const p1Sub = this.mode === '1p' ? 'JUGADOR 1' : 'JUGADOR 1';
    const p2Sub = this.mode === '1p' ? 'CPU  ·  ' + NC.DIFFICULTY[this.difficultyKey].label : 'JUGADOR 2';

    this.add.image(60, 58, 'portrait-kai').setDisplaySize(72, 72).setDepth(101);
    this.add.image(1220, 58, 'portrait-raze').setDisplaySize(72, 72).setDepth(101);

    this.hudStatic.lineStyle(2, 0x22e6ff, 0.85);
    this.hudStatic.strokeRect(24, 22, 72, 72);
    this.hudStatic.lineStyle(2, 0xff3c8c, 0.85);
    this.hudStatic.strokeRect(1184, 22, 72, 72);
    this.hudStatic.lineStyle(1, 0xffffff, 0.18);
    this.hudStatic.strokeRect(28, 26, 64, 64);
    this.hudStatic.strokeRect(1188, 26, 64, 64);

    this.p1Name = this.add.text(110, 24, 'KAI', NC.textStyle(24, NC.CSS.white, '900')).setDepth(101);
    this.p1Name.setShadow(0, 0, NC.CSS.cyan, 12, true, true);
    this.add.text(110, 51, p1Sub, NC.bodyStyle(13, NC.CSS.muted, '600')).setDepth(101);

    this.p2Name = this.add.text(1170, 24, 'RAZE', NC.textStyle(24, NC.CSS.white, '900')).setOrigin(1, 0).setDepth(101);
    this.p2Name.setShadow(0, 0, NC.CSS.magenta, 12, true, true);
    this.add.text(1170, 51, p2Sub, NC.bodyStyle(13, NC.CSS.muted, '600')).setOrigin(1, 0).setDepth(101);

    this.timerText = this.add.text(640, 62, '60', NC.textStyle(40, NC.CSS.white, '900')).setOrigin(0.5).setDepth(102);
    this.roundLabel = this.add.text(640, 118, 'ROUND 1  ·  MEJOR DE 3', NC.bodyStyle(12, NC.CSS.muted, '600'))
      .setOrigin(0.5).setDepth(102).setLetterSpacing(2);

    this.comboP1Text = this.add.text(206, 196, '', {
      ...NC.textStyle(30, NC.CSS.cyan, '900'),
      align: 'left',
      lineSpacing: -6,
    }).setOrigin(0, 0.5).setDepth(112).setAlpha(0);
    this.comboP2Text = this.add.text(1074, 196, '', {
      ...NC.textStyle(30, NC.CSS.magenta, '900'),
      align: 'right',
      lineSpacing: -6,
    }).setOrigin(1, 0.5).setDepth(112).setAlpha(0);

    this.p1MeterFlash = 0;
    this.p2MeterFlash = 0;
  }

  drawHealthBar(g, x, y, w, h, ratio, trail, accent, flip) {
    const skew = 12;
    const bg = flip
      ? [{ x: x + skew, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
      : [{ x, y }, { x: x + w, y }, { x: x + w - skew, y: y + h }, { x, y: y + h }];

    g.fillStyle(0x05060f, 0.92);
    g.fillPoints(bg, true);
    g.lineStyle(1.5, accent, 0.45);
    g.strokePoints(bg, true);

    const fillPts = (r) => {
      if (r <= 0.001) return null;
      const fw = w * r;
      if (flip) {
        const inner = x + w - fw + skew * r;
        return [
          { x: x + w, y: y + 2 },
          { x: x + w - fw, y: y + 2 },
          { x: inner, y: y + h - 2 },
          { x: x + w, y: y + h - 2 },
        ];
      }
      const inner = x + fw - skew * r;
      return [
        { x, y: y + 2 },
        { x: x + fw, y: y + 2 },
        { x: inner, y: y + h - 2 },
        { x, y: y + h - 2 },
      ];
    };

    const t = fillPts(Math.max(ratio, trail));
    if (t) {
      g.fillStyle(0xffffff, 0.32);
      g.fillPoints(t, true);
    }

    const color = ratio <= 0.25 ? NC.COLORS.red : ratio <= 0.5 ? NC.COLORS.yellow : accent;
    const f = fillPts(ratio);
    if (f) {
      g.fillStyle(color, 0.95);
      g.fillPoints(f, true);
      g.lineStyle(1, 0xffffff, 0.28);
      g.strokePoints(f, true);
    }

    // marcas cada 10 %
    g.lineStyle(1, 0x000000, 0.28);
    for (let i = 1; i < 10; i++) {
      const tx = x + (w * i) / 10;
      g.lineBetween(tx, y + 4, tx, y + h - 4);
    }
    g.lineStyle(1, 0xffffff, 0.15);
    g.lineBetween(x + 4, y + 3, x + w - 4, y + 3);
  }

  drawMeter(g, x, y, w, h, ratio, accent, flip) {
    g.fillStyle(0x05060f, 0.9);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, accent, 0.28);
    g.strokeRect(x, y, w, h);
    if (ratio > 0) {
      const fw = w * ratio;
      g.fillStyle(accent, ratio >= 0.5 ? 0.95 : 0.7);
      if (flip) g.fillRect(x + w - fw, y + 1, fw, h - 2);
      else g.fillRect(x + 1, y + 1, fw, h - 2);
      g.fillStyle(0xffffff, 0.5);
      if (flip) g.fillRect(x + w - fw, y + 1, fw, 1);
      else g.fillRect(x + 1, y + 1, fw, 1);
    }
    // marca de 50 %
    g.lineStyle(1, 0xffffff, 0.35);
    g.lineBetween(x + w * 0.5, y, x + w * 0.5, y + h);
  }

  drawPips(g, x, y, wins, accent, flip) {
    for (let i = 0; i < NC.ROUNDS_TO_WIN; i++) {
      const px = flip ? x - i * 20 : x + i * 20;
      const pts = [
        { x: px, y: y - 6 },
        { x: px + 6, y },
        { x: px, y: y + 6 },
        { x: px - 6, y },
      ];
      if (i < wins) {
        g.fillStyle(accent, 0.95);
        g.fillPoints(pts, true);
      } else {
        g.lineStyle(1.5, accent, 0.4);
        g.strokePoints(pts, true);
      }
    }
  }

  drawTimer(g) {
    const cx = 640;
    const cy = 62;
    const r = 44;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (Math.PI * 2 * i) / 6;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    g.fillStyle(0x05060f, 0.95);
    g.fillPoints(pts, true);
    const low = this.timeLeft <= 10 && this.roundState === 'fighting';
    const color = low ? NC.COLORS.red : this.roundState === 'fighting' ? NC.COLORS.cyan : NC.COLORS.muted;
    g.lineStyle(2, color, 0.95);
    g.strokePoints(pts, true);
    const inner = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (Math.PI * 2 * i) / 6;
      inner.push({ x: cx + Math.cos(a) * (r - 7), y: cy + Math.sin(a) * (r - 7) });
    }
    g.lineStyle(1, color, 0.35);
    g.strokePoints(inner, true);
    g.fillStyle(color, 0.12);
    g.fillPoints(pts, true);
  }

  updateHUD(force) {
    if (force) {
      this.p1Trail = this.p1.healthRatio;
      this.p2Trail = this.p2.healthRatio;
    } else {
      this.p1Trail = Phaser.Math.Linear(this.p1Trail, this.p1.healthRatio, 0.075);
      this.p2Trail = Phaser.Math.Linear(this.p2Trail, this.p2.healthRatio, 0.075);
      if (Math.abs(this.p1Trail - this.p1.healthRatio) < 0.001) this.p1Trail = this.p1.healthRatio;
      if (Math.abs(this.p2Trail - this.p2.healthRatio) < 0.001) this.p2Trail = this.p2.healthRatio;
    }

    const g = this.hudGraphics;
    g.clear();

    this.drawHealthBar(g, 110, 70, 490, 24, this.p1.healthRatio, this.p1Trail, NC.COLORS.cyan, false);
    this.drawHealthBar(g, 680, 70, 490, 24, this.p2.healthRatio, this.p2Trail, NC.COLORS.magenta, true);
    this.drawMeter(g, 110, 100, 490, 6, this.p1.meterRatio, NC.COLORS.cyan, false);
    this.drawMeter(g, 680, 100, 490, 6, this.p2.meterRatio, NC.COLORS.magenta, true);
    this.drawPips(g, 116, 124, this.p1Wins, NC.COLORS.cyan, false);
    this.drawPips(g, 1164, 124, this.p2Wins, NC.COLORS.magenta, true);
    this.drawTimer(g);

    const time = Math.max(0, Math.ceil(this.timeLeft));
    this.timerText.setText(String(time));
    const low = time <= 10 && this.roundState === 'fighting';
    this.timerText.setColor(low ? NC.CSS.red : NC.CSS.white);
    this.timerText.setScale(low ? 1 + Math.sin(this.time.now / 90) * 0.06 : 1);
    this.roundLabel.setText('ROUND ' + this.round + '  ·  MEJOR DE 3');

    // aviso de especial disponible
    if (this.p1.meter >= NC.ATTACKS.special.cost) {
      this.p1MeterFlash += 0.05;
      const a = 0.25 + Math.sin(this.p1MeterFlash) * 0.18;
      g.fillStyle(0xffffff, a);
      g.fillRect(110, 99, 490 * this.p1.meterRatio, 1);
    }
    if (this.p2.meter >= NC.ATTACKS.special.cost) {
      this.p2MeterFlash += 0.05;
      const a = 0.25 + Math.sin(this.p2MeterFlash) * 0.18;
      g.fillStyle(0xffffff, a);
      g.fillRect(680 + 490 * (1 - this.p2.meterRatio), 99, 490 * this.p2.meterRatio, 1);
    }
  }

  /* ----------------------------- INPUT ----------------------------- */
  createInput() {
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      A: KC.A, D: KC.D, W: KC.W, S: KC.S, J: KC.J, K: KC.K, L: KC.L, U: KC.U, SHIFT: KC.SHIFT,
      SPACE: KC.SPACE,
      LEFT: KC.LEFT, RIGHT: KC.RIGHT, UP: KC.UP, DOWN: KC.DOWN,
      ONE: KC.ONE, TWO: KC.TWO, THREE: KC.THREE, FOUR: KC.FOUR,
      P: KC.P, ESC: KC.ESC, M: KC.M, F: KC.F, R: KC.R, ENTER: KC.ENTER,
    });

    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.keyboard.on('keydown-M', () => {
      if (this.matchOver || this.paused) {
        NCAudio.duckMusic(false);
        this.physics.world.resume();
        this.anims.resumeAll();
        this.scene.start('MenuScene');
        return;
      }
      const muted = NCAudio.toggleMute();
      this.showToast(muted ? 'AUDIO SILENCIADO' : 'AUDIO ACTIVADO', NC.CSS.yellow);
    });
    this.input.keyboard.on('keydown-R', () => {
      if (this.matchOver || this.paused) {
        this.restartMatch();
      }
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.matchOver) this.restartMatch();
      else if (this.paused) this.togglePause();
    });
  }

  getPlayerInput() {
    const twoP = this.mode === '2p';
    const k = this.keys;
    const input = {
      left: k.A.isDown || (!twoP && k.LEFT.isDown),
      right: k.D.isDown || (!twoP && k.RIGHT.isDown),
      up: k.W.isDown || k.SPACE.isDown || (!twoP && k.UP.isDown),
      down: k.S.isDown || (!twoP && k.DOWN.isDown),
      punch: k.J.isDown,
      kick: k.K.isDown,
      block: k.L.isDown || k.SHIFT.isDown,
      special: k.U.isDown,
    };
    if (this.touchInput) {
      for (const key in input) {
        if (this.touchInput[key]) input[key] = true;
      }
    }
    return input;
  }

  getP2Input() {
    if (this.mode !== '2p') return this.p2.emptyInput();
    const k = this.keys;
    return {
      left: k.LEFT.isDown,
      right: k.RIGHT.isDown,
      up: k.UP.isDown,
      down: k.DOWN.isDown,
      punch: k.ONE.isDown,
      kick: k.TWO.isDown,
      block: k.THREE.isDown,
      special: k.FOUR.isDown,
    };
  }

  createTouchControls() {
    const coarse = (this.sys.game.device.input.touch && window.matchMedia('(pointer: coarse)').matches)
      || window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) return;

    this.input.addPointer(3);
    this.touchInput = this.p1.emptyInput();
    const make = (x, y, w, h, label, key, color) => {
      const c = this.add.container(x, y).setDepth(150);
      const bg = this.add.rectangle(0, 0, w, h, 0x05060f, 0.42)
        .setStrokeStyle(1.5, color, 0.6)
        .setInteractive();
      const t = this.add.text(0, 0, label, NC.textStyle(16, '#ffffff', '700')).setOrigin(0.5);
      c.add([bg, t]);
      const press = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.touchInput[key] = true;
        bg.setFillStyle(color, 0.38);
      };
      const release = () => {
        this.touchInput[key] = false;
        bg.setFillStyle(0x05060f, 0.42);
      };
      bg.on('pointerdown', press);
      bg.on('pointerup', release);
      bg.on('pointerout', release);
      bg.on('pointerupoutside', release);
      return c;
    };

    make(54, 646, 62, 58, '◀', 'left', NC.COLORS.cyan);
    make(130, 646, 62, 58, '▶', 'right', NC.COLORS.cyan);
    make(92, 578, 62, 50, '▲', 'up', NC.COLORS.cyan);
    make(92, 694, 62, 44, '▼', 'down', NC.COLORS.cyan);

    make(1212, 606, 72, 58, 'PUÑO', 'punch', NC.COLORS.magenta);
    make(1130, 606, 72, 58, 'PATADA', 'kick', NC.COLORS.magenta);
    make(1212, 672, 72, 58, 'BLOQ.', 'block', NC.COLORS.cyan);
    make(1130, 672, 72, 58, 'ESP.', 'special', NC.COLORS.yellow);
  }

  /* ----------------------------- RONDA ----------------------------- */
  startRound() {
    this.clearProjectiles();
    this.physics.world.timeScale = 1;
    this.roundState = 'intro';
    this.roundResolved = false;
    this.timeLeft = NC.ROUND_TIME;
    this.comboP1 = 0;
    this.comboP2 = 0;
    this.lastHitP1 = -9999;
    this.lastHitP2 = -9999;
    this.p1Trail = 1;
    this.p2Trail = 1;
    this.p1.roundWins = this.p1Wins;
    this.p2.roundWins = this.p2Wins;
    this.p1.reset(380, 1);
    this.p2.reset(900, -1);
    if (this.ai) this.ai.reset();
    this.p1.meter = Math.max(this.p1.meter, 0);
    this.p2.meter = Math.max(this.p2.meter, 0);
    this.updateHUD(true);
    this.cameras.main.zoomTo(1, 300);
    this.cameras.main.pan(NC.W / 2, NC.H / 2, 300);

    this.announce('ROUND ' + this.round, NC.CSS.cyan, 92, 650);
    NCAudio.play('round', 0.5);

    this.time.delayedCall(950, () => {
      if (this.matchOver) return;
      this.roundState = 'fighting';
      this.announce('FIGHT!', NC.CSS.yellow, 112, 380);
      this.cameras.main.flash(120, 34, 230, 255);
      NCAudio.play('round', 0.35, 1.25);
    });
  }

  onTimeout() {
    if (this.roundState !== 'fighting' || this.roundResolved) return;
    this.roundResolved = true;
    this.roundState = 'timeout';
    this.announce('¡TIEMPO!', NC.CSS.yellow, 100, 900);
    NCAudio.play('ko', 0.5);
    let winner = null;
    if (this.p1.health > this.p2.health) winner = this.p1;
    else if (this.p2.health > this.p1.health) winner = this.p2;
    this.time.delayedCall(1500, () => this.endRound(winner));
  }

  onKO(loser, winner) {
    if (this.roundState !== 'fighting' || this.roundResolved) return;
    this.roundResolved = true;
    this.roundState = 'ko';
    loser.playKO();
    winner.playWin();
    this.announce('K.O.', NC.CSS.red, 150, 1250);
    this.cameras.main.shake(420, 0.014);
    this.cameras.main.zoomTo(1.06, 650, 'Sine.easeOut');
    NCAudio.play('ko', 0.8);
    this.tweens.add({
      targets: this.physics.world,
      timeScale: 2.6,
      duration: 260,
      yoyo: true,
      hold: 1100,
      onComplete: () => {
        this.physics.world.timeScale = 1;
      },
    });
    this.time.delayedCall(2300, () => this.endRound(winner));
  }

  endRound(winner) {
    if (this.matchOver) return;
    if (winner === this.p1) {
      this.p1Wins++;
      this.p1.roundWins = this.p1Wins;
    } else if (winner === this.p2) {
      this.p2Wins++;
      this.p2.roundWins = this.p2Wins;
    }
    this.updateHUD(true);

    if (this.p1Wins >= NC.ROUNDS_TO_WIN || this.p2Wins >= NC.ROUNDS_TO_WIN) {
      this.time.delayedCall(400, () => this.endMatch());
      return;
    }

    const txt = winner ? winner.displayName + ' GANA EL ROUND' : 'ROUND EMPATADO';
    this.time.delayedCall(250, () => {
      this.announce(txt, winner === this.p1 ? NC.CSS.cyan : NC.CSS.magenta, 42, 900);
    });

    this.time.delayedCall(1900, () => {
      this.round++;
      this.startRound();
    });
  }

  endMatch() {
    if (this.matchOver) return;
    this.matchOver = true;
    this.roundState = 'matchEnd';
    this.clearProjectiles();
    this.physics.world.pause();
    NCAudio.play('win', 0.65);
    this.cameras.main.zoomTo(1, 400);
    this.showMatchEnd();
  }

  restartMatch() {
    this.physics.world.timeScale = 1;
    this.physics.world.resume();
    this.anims.resumeAll();
    this.scene.restart({ mode: this.mode, difficulty: this.difficultyKey });
  }

  /* ----------------------------- EFECTOS ----------------------------- */
  announce(text, color, size, hold) {
    if (this.currentAnnouncement) {
      const old = this.currentAnnouncement;
      old.text.destroy();
      old.band.destroy();
      this.currentAnnouncement = null;
    }

    const band = this.add.rectangle(NC.W / 2, 300, NC.W, 142, 0x05060f, 0.0).setDepth(118);
    const t = this.add.text(NC.W / 2, 300, text, NC.textStyle(size, color, '900'))
      .setOrigin(0.5)
      .setDepth(120)
      .setScale(0.45)
      .setAlpha(0);
    t.setStroke('#05060f', 9);
    t.setShadow(0, 0, color, 28, true, true);

    this.tweens.add({ targets: band, fillAlpha: 0.45, duration: 140, yoyo: true, hold: hold + 250 });
    this.tweens.add({
      targets: t,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: t,
      alpha: 0,
      scale: 1.12,
      delay: hold,
      duration: 220,
      onComplete: () => {
        t.destroy();
        band.destroy();
        if (this.currentAnnouncement && this.currentAnnouncement.text === t) {
          this.currentAnnouncement = null;
        }
      },
    });
    this.currentAnnouncement = { text: t, band };
  }

  hitSpark(x, y, color, big) {
    const count = big ? 20 : 12;
    const emitter = this.add.particles(x, y, 'spark', {
      speed: { min: 120, max: big ? 560 : 380 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 180, max: 430 },
      scale: { start: big ? 1.15 : 0.75, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(30);
    emitter.explode(count);
    this.time.delayedCall(600, () => emitter.destroy());

    const flash = this.add.image(x, y, 'glow')
      .setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(29)
      .setScale(0.25).setAlpha(0.9);
    this.tweens.add({ targets: flash, scale: big ? 1.5 : 1.0, alpha: 0, duration: 240, onComplete: () => flash.destroy() });

    const ring = this.add.image(x, y, 'ring')
      .setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(29)
      .setScale(0.2).setAlpha(0.85);
    this.tweens.add({ targets: ring, scale: big ? 1.1 : 0.8, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  dust(x, y) {
    const emitter = this.add.particles(x, y - 4, 'dust', {
      speed: { min: 20, max: 95 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.35, end: 0 },
      tint: 0x9fb0cc,
      emitting: false,
    }).setDepth(8);
    emitter.explode(8);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  hitStop(ms) {
    if (this.hitStopping) return;
    this.hitStopping = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    this.time.delayedCall(ms, () => {
      if (!this.paused) {
        this.physics.world.resume();
        this.anims.resumeAll();
      }
      this.hitStopping = false;
    });
  }

  floatingDamage(x, y, amount, color) {
    const t = this.add.text(x, y, '-' + amount, NC.textStyle(22, color, '900'))
      .setOrigin(0.5).setDepth(130).setStroke('#05060f', 4);
    this.tweens.add({
      targets: t,
      y: y - 52,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  showCombo(side) {
    const isP1 = side === 1;
    const n = isP1 ? this.comboP1 : this.comboP2;
    if (n < 2) return;
    const t = isP1 ? this.comboP1Text : this.comboP2Text;
    const color = isP1 ? NC.CSS.cyan : NC.CSS.magenta;
    t.setText(n + ' HITS\nCOMBO');
    t.setColor(color);
    t.setAlpha(1);
    t.setScale(1.35);
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1150, duration: 300 });
  }

  showToast(text, color) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = this.add.text(NC.W / 2, 612, text, NC.textStyle(15, color, '700'))
      .setOrigin(0.5).setDepth(140).setStroke('#05060f', 4).setAlpha(0);
    this.tweens.add({
      targets: this.toastText,
      alpha: 1,
      y: 602,
      duration: 160,
      hold: 850,
      yoyo: true,
      onComplete: () => {
        if (this.toastText) this.toastText.destroy();
        this.toastText = null;
      },
    });
  }

  onJump(fighter) {
    this.dust(fighter.sprite.x, NC.FLOOR);
    NCAudio.play('jump', 0.3);
  }

  onLand(fighter) {
    this.dust(fighter.sprite.x, NC.FLOOR);
  }

  onMeterSpent(fighter) {
    this.cameras.main.flash(90, 34, 230, 255);
  }

  onNoMeter(fighter) {
    if (this.noMeterCooldown && this.time.now < this.noMeterCooldown) return;
    this.noMeterCooldown = this.time.now + 900;
    this.showToast('ESPECIAL: ENERGÍA INSUFICIENTE', NC.CSS.yellow);
  }

  onHit(defender, attacker, x, y, kind) {
    const big = kind === 'kick' || kind === 'special';
    this.hitSpark(x, y, attacker.accent, big);
    this.cameras.main.shake(big ? 160 : 100, big ? 0.009 : 0.005);
    this.hitStop(kind === 'special' ? 70 : 42);

    const damage = NC.ATTACKS[kind].damage;
    if (defender === this.p1) this.p1Trail = Math.min(1, this.p1Trail + damage / NC.MAX_HEALTH);
    else this.p2Trail = Math.min(1, this.p2Trail + damage / NC.MAX_HEALTH);
    this.floatingDamage(x, y - 20, damage, attacker.accentCss);

    const now = this.time.now;
    if (attacker === this.p1) {
      this.comboP1 = now - this.lastHitP1 < 1350 ? this.comboP1 + 1 : 1;
      this.lastHitP1 = now;
      this.showCombo(1);
    } else {
      this.comboP2 = now - this.lastHitP2 < 1350 ? this.comboP2 + 1 : 1;
      this.lastHitP2 = now;
      this.showCombo(2);
    }
  }

  onBlock(defender, attacker, x, y, kind) {
    this.hitSpark(x, y, 0x8fe8ff, false);
    this.cameras.main.shake(70, 0.003);
    const chip = Math.max(1, Math.round(NC.ATTACKS[kind].damage * 0.18));
    if (defender === this.p1) this.p1Trail = Math.min(1, this.p1Trail + chip / NC.MAX_HEALTH);
    else this.p2Trail = Math.min(1, this.p2Trail + chip / NC.MAX_HEALTH);
    if (attacker === this.p1) {
      this.comboP1 = 0;
      this.comboP1Text.setAlpha(0);
    } else {
      this.comboP2 = 0;
      this.comboP2Text.setAlpha(0);
    }
    this.floatingDamage(x, y - 16, chip, '#bfefff');
  }

  onAttackHit() {
    // hook de extensión
  }

  /* ----------------------------- PROYECTILES ----------------------------- */
  spawnProjectile(owner) {
    const dir = owner.facing;
    const proj = this.physics.add.sprite(owner.sprite.x + dir * 72, owner.sprite.y - 108, 'energy');
    proj.setTint(owner.accent);
    proj.setBlendMode(Phaser.BlendModes.ADD);
    proj.setDepth(18);
    proj.setScale(1.05);
    proj.body.setAllowGravity(false);
    proj.body.setCircle(34, 14, 14);
    proj.setVelocityX(dir * 760);
    proj.owner = owner;
    proj.dir = dir;
    proj.startX = proj.x;

    const trail = this.add.particles(0, 0, 'spark', {
      follow: proj,
      lifespan: 330,
      speed: { min: 10, max: 55 },
      scale: { start: 0.85, end: 0 },
      alpha: { start: 0.85, end: 0 },
      tint: owner.accent,
      blendMode: 'ADD',
      frequency: 18,
      quantity: 1,
    }).setDepth(17);
    proj.trail = trail;

    this.physics.add.overlap(proj, this.p1.sprite, () => this.onProjectileHit(proj, this.p1));
    this.physics.add.overlap(proj, this.p2.sprite, () => this.onProjectileHit(proj, this.p2));

    this.projectiles.push(proj);
    this.hitSpark(proj.x, proj.y, owner.accent, false);
  }

  onProjectileHit(proj, target) {
    if (!proj.active || !proj.scene) return;
    if (target === proj.owner) return;
    if (target.state === 'ko' || target.state === 'win') return;
    if (this.roundState !== 'fighting') return;
    const result = target.receiveHit(proj.owner, 'special', proj.dir);
    if (result) {
      this.hitSpark(proj.x, proj.y, proj.owner.accent, true);
      this.destroyProjectile(proj);
    }
  }

  destroyProjectile(proj) {
    if (!proj) return;
    if (proj.trail) {
      proj.trail.stop();
      const tr = proj.trail;
      this.time.delayedCall(400, () => tr.destroy());
    }
    const idx = this.projectiles.indexOf(proj);
    if (idx >= 0) this.projectiles.splice(idx, 1);
    proj.destroy();
  }

  clearProjectiles() {
    for (const proj of this.projectiles.slice()) {
      this.destroyProjectile(proj);
    }
    this.projectiles.length = 0;
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.setScale(1.05 + Math.sin(this.time.now / 90) * 0.08);
      if (p.x < -80 || p.x > NC.W + 80) {
        this.destroyProjectile(p);
      }
    }
    // choque de proyectiles
    if (this.projectiles.length >= 2) {
      for (let i = 0; i < this.projectiles.length; i++) {
        for (let j = i + 1; j < this.projectiles.length; j++) {
          const a = this.projectiles[i];
          const b = this.projectiles[j];
          if (a && b && Math.abs(a.x - b.x) < 54 && Math.abs(a.y - b.y) < 54) {
            this.hitSpark((a.x + b.x) / 2, (a.y + b.y) / 2, 0xffffff, true);
            this.cameras.main.shake(180, 0.01);
            this.destroyProjectile(a);
            this.destroyProjectile(b);
            break;
          }
        }
      }
    }
  }

  /* ----------------------------- PAUSA ----------------------------- */
  createPauseOverlay() {
    this.pauseContainer = this.add.container(0, 0).setDepth(200).setVisible(false).setAlpha(0);
    const backdrop = this.add.rectangle(0, 0, NC.W, NC.H, 0x02030a, 0.82).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.98);
    panel.fillRoundedRect(310, 130, 660, 460, 12);
    panel.lineStyle(2, 0x22e6ff, 0.8);
    panel.strokeRoundedRect(310, 130, 660, 460, 12);
    panel.lineStyle(1, 0xff3c8c, 0.4);
    panel.strokeRoundedRect(320, 140, 640, 440, 9);
    panel.fillStyle(0x22e6ff, 0.8);
    panel.fillRect(310, 130, 180, 3);
    panel.fillStyle(0xff3c8c, 0.8);
    panel.fillRect(790, 587, 180, 3);

    const title = this.add.text(640, 200, 'PAUSA', NC.textStyle(64, NC.CSS.white, '900')).setOrigin(0.5);
    title.setShadow(0, 0, NC.CSS.cyan, 24, true, true);

    const sub = this.add.text(640, 255, 'EL COMBATE ESTÁ EN PAUSA', NC.bodyStyle(16, NC.CSS.muted, '600')).setOrigin(0.5);

    const info = this.add.text(640, 320,
      'P / ESC   —   CONTINUAR\n' +
      'R   —   REINICIAR COMBATE\n' +
      'M   —   MENÚ PRINCIPAL\n' +
      'F   —   PANTALLA COMPLETA',
      {
        ...NC.bodyStyle(20, NC.CSS.white, '600'),
        align: 'center',
        lineSpacing: 12,
      }).setOrigin(0.5);

    const hint = this.add.text(640, 520, 'PULSA P O ESC PARA VOLVER AL COMBATE', NC.textStyle(14, NC.CSS.yellow, '700')).setOrigin(0.5);

    this.pauseContainer.add([backdrop, panel, title, sub, info, hint]);
  }

  togglePause() {
    if (this.matchOver || this.roundState === 'matchEnd') return;
    if (!this.paused && this.roundState !== 'fighting') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.world.pause();
      this.anims.pauseAll();
      NCAudio.duckMusic(true);
      this.pauseContainer.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.pauseContainer, alpha: 1, duration: 160 });
    } else {
      this.physics.world.resume();
      this.anims.resumeAll();
      NCAudio.duckMusic(false);
      this.tweens.add({
        targets: this.pauseContainer,
        alpha: 0,
        duration: 140,
        onComplete: () => this.pauseContainer.setVisible(false),
      });
    }
  }

  /* ----------------------------- FIN DE PARTIDA ----------------------------- */
  createMatchEndOverlay() {
    this.matchEndContainer = this.add.container(0, 0).setDepth(210).setVisible(false).setAlpha(0);
  }

  showMatchEnd() {
    this.matchEndContainer.removeAll(true);
    const p1Won = this.p1Wins > this.p2Wins;
    const winner = p1Won ? this.p1 : this.p2;
    const is2p = this.mode === '2p';
    let title;
    let color;
    if (is2p) {
      title = '¡' + winner.displayName + ' GANA!';
      color = winner.accentCss;
    } else {
      title = p1Won ? '¡VICTORIA!' : 'DERROTA';
      color = p1Won ? NC.CSS.cyan : NC.CSS.red;
    }

    const backdrop = this.add.rectangle(0, 0, NC.W, NC.H, 0x02030a, 0.78).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.97);
    panel.fillRoundedRect(240, 130, 800, 470, 14);
    panel.lineStyle(2, winner.accent, 0.9);
    panel.strokeRoundedRect(240, 130, 800, 470, 14);
    panel.lineStyle(1, 0xffffff, 0.18);
    panel.strokeRoundedRect(252, 142, 776, 446, 10);
    panel.fillStyle(winner.accent, 0.9);
    panel.fillRect(240, 130, 220, 3);
    panel.fillStyle(0xffffff, 0.65);
    panel.fillRect(820, 597, 220, 3);

    const t = this.add.text(640, 225, title, NC.textStyle(74, color, '900')).setOrigin(0.5);
    t.setStroke('#05060f', 8);
    t.setShadow(0, 0, color, 30, true, true);

    const score = this.add.text(640, 305, this.p1.displayName + '   ' + this.p1Wins + '  —  ' + this.p2Wins + '   ' + this.p2.displayName,
      NC.textStyle(28, NC.CSS.white, '700')).setOrigin(0.5);

    const perfect = !is2p && p1Won && this.p1.health === NC.MAX_HEALTH;
    const sub = this.add.text(640, 352,
      perfect ? '¡ROUND PERFECTO!' : is2p ? 'DUELO LOCAL FINALIZADO' : p1Won ? 'HAS GANADO EL COMBATE' : 'RAZE DOMINA LA ARENA',
      NC.bodyStyle(20, perfect ? NC.CSS.yellow : NC.CSS.muted, '600')).setOrigin(0.5);

    const rematch = this.add.text(640, 445, 'R / ENTER   —   REVANCHA', NC.textStyle(22, NC.CSS.yellow, '700'))
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const menu = this.add.text(640, 505, 'M   —   MENÚ PRINCIPAL', NC.textStyle(18, NC.CSS.muted, '700'))
      .setOrigin(0.5).setInteractive({ useHandCursor: true });

    rematch.on('pointerover', () => rematch.setColor(NC.CSS.white));
    rematch.on('pointerout', () => rematch.setColor(NC.CSS.yellow));
    rematch.on('pointerdown', () => this.restartMatch());
    menu.on('pointerover', () => menu.setColor(NC.CSS.white));
    menu.on('pointerout', () => menu.setColor(NC.CSS.muted));
    menu.on('pointerdown', () => this.scene.start('MenuScene'));

    const hint = this.add.text(640, 565, 'GRACIAS POR JUGAR  ·  NEON CLASH', NC.bodyStyle(13, NC.CSS.muted, '600')).setOrigin(0.5);

    this.matchEndContainer.add([backdrop, panel, t, score, sub, rematch, menu, hint]);
    this.matchEndContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.matchEndContainer, alpha: 1, duration: 300 });

    // confeti
    const colors = [winner.accent, 0xffffff, 0xffe066];
    const confetti = this.add.particles(0, 0, 'pixel', {
      x: { min: 280, max: 1000 },
      y: 140,
      lifespan: 2200,
      speedY: { min: 120, max: 260 },
      speedX: { min: -90, max: 90 },
      scale: { start: 1.4, end: 0.2 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      tint: colors,
      quantity: 3,
      frequency: 90,
      blendMode: 'ADD',
    }).setDepth(209);
    this.time.delayedCall(2600, () => confetti.stop());
    this.time.delayedCall(5200, () => confetti.destroy());
  }

  /* ----------------------------- UPDATE ----------------------------- */
  update(time, delta) {
    if (this.paused) return;
    const dt = Math.min(delta, 50);

    if (this.roundState === 'fighting' && !this.matchOver) {
      this.timeLeft = Math.max(0, this.timeLeft - dt / 1000);
      if (this.timeLeft <= 0) this.onTimeout();
    }

    let p1Input = this.p1.emptyInput();
    let p2Input = this.p2.emptyInput();

    if (this.roundState === 'fighting' && !this.matchOver) {
      p1Input = this.getPlayerInput();
      if (this.ai) {
        p2Input = this.ai.update(dt);
      } else {
        p2Input = this.getP2Input();
      }
    }

    this.p1.update(dt, p1Input, this.p2);
    this.p2.update(dt, p2Input, this.p1);
    this.p1.updateVisuals();
    this.p2.updateVisuals();
    this.updateHUD(false);
    this.updateProjectiles(dt);

    // fin de combos por tiempo
    if (this.time.now - this.lastHitP1 > 1500 && this.comboP1 > 0) {
      this.comboP1 = 0;
      this.tweens.add({ targets: this.comboP1Text, alpha: 0, duration: 220 });
    }
    if (this.time.now - this.lastHitP2 > 1500 && this.comboP2 > 0) {
      this.comboP2 = 0;
      this.tweens.add({ targets: this.comboP2Text, alpha: 0, duration: 220 });
    }
  }
}
