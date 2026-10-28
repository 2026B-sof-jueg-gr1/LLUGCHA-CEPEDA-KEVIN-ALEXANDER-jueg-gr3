/* =========================================================================
   NEON CLASH — punto de entrada
   Taller Práctico: Setup, Desarrollo y Despliegue con Phaser 3
   ========================================================================= */
'use strict';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: NC.W,
  height: NC.H,
  backgroundColor: '#05060f',
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  banner: false,
  disableContextMenu: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: NC.GRAVITY },
      debug: false,
      fps: 60,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: NC.W,
    height: NC.H,
  },
  input: {
    activePointers: 4,
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [BootScene, MenuScene, FightScene],
};

async function bootGame() {
  // Esperar a que las fuentes estén listas para que Phaser mida bien los textos.
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load('700 16px Orbitron'),
        document.fonts.load('900 16px Orbitron'),
        document.fonts.load('600 16px Rajdhani'),
      ]);
      await document.fonts.ready;
    }
  } catch (e) {
    // Si el navegador no soporta Font Loading API, se usa la fuente de respaldo.
  }

  window.neonClash = new Phaser.Game(config);
}

window.addEventListener('load', bootGame);
