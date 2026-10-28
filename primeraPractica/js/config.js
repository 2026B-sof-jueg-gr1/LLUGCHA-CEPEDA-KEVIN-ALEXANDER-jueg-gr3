/* =========================================================================
   NEON CLASH — configuración global
   Taller Práctico: Setup, Desarrollo y Despliegue con Phaser 3
   ========================================================================= */
'use strict';

const NC = {
  W: 1280,
  H: 720,
  FLOOR: 650,
  GRAVITY: 2400,
  ROUND_TIME: 60,
  ROUNDS_TO_WIN: 2,
  MAX_HEALTH: 100,
  MAX_METER: 100,

  COLORS: {
    cyan: 0x22e6ff,
    blue: 0x0084ff,
    magenta: 0xff3c8c,
    orange: 0xff9228,
    yellow: 0xffe066,
    red: 0xff3355,
    white: 0xffffff,
    dark: 0x05060f,
    panel: 0x080c18,
    panel2: 0x0d1426,
  },

  CSS: {
    cyan: '#22e6ff',
    blue: '#0084ff',
    magenta: '#ff3c8c',
    orange: '#ff9228',
    yellow: '#ffe066',
    red: '#ff3355',
    white: '#ffffff',
    muted: '#8fa3c8',
    dark: '#05060f',
  },

  ATTACKS: {
    punch: {
      damage: 7,
      range: 122,
      startup: 65,
      active: 110,
      recovery: 145,
      cooldown: 240,
      hitstun: 230,
      knockback: 120,
      meter: 8,
      lift: 0,
    },
    kick: {
      damage: 12,
      range: 158,
      startup: 115,
      active: 125,
      recovery: 220,
      cooldown: 440,
      hitstun: 330,
      knockback: 270,
      meter: 12,
      lift: 110,
    },
    special: {
      damage: 20,
      range: 9999,
      startup: 250,
      active: 120,
      recovery: 360,
      cooldown: 800,
      hitstun: 500,
      knockback: 420,
      meter: 0,
      cost: 50,
      lift: 180,
    },
    airkick: {
      damage: 10,
      range: 150,
      startup: 50,
      active: 190,
      recovery: 120,
      cooldown: 380,
      hitstun: 300,
      knockback: 220,
      meter: 10,
      lift: 0,
    },
  },

  DIFFICULTY: {
    facil: { label: 'FÁCIL', reaction: 430, aggression: 0.40, block: 0.20, special: 0.16, speed: 0.84 },
    normal: { label: 'NORMAL', reaction: 285, aggression: 0.62, block: 0.40, special: 0.34, speed: 1.00 },
    dificil: { label: 'DIFÍCIL', reaction: 175, aggression: 0.80, block: 0.62, special: 0.52, speed: 1.08 },
  },

  CONTROLS_P1: [
    ['Mover', 'A / D  ·  ← / →'],
    ['Saltar', 'W  ·  ↑  ·  ESPACIO'],
    ['Agacharse', 'S  ·  ↓'],
    ['Puñetazo', 'J'],
    ['Patada', 'K'],
    ['Bloquear', 'L  ·  SHIFT'],
    ['Especial', 'U'],
  ],

  CONTROLS_P2: [
    ['Mover', '← / →'],
    ['Saltar', '↑'],
    ['Agacharse', '↓'],
    ['Puñetazo', '1'],
    ['Patada', '2'],
    ['Bloquear', '3'],
    ['Especial', '4'],
  ],
};

// Texto con estilo neón reutilizable
NC.textStyle = function (size, color, weight) {
  return {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: size + 'px',
    fontStyle: 'normal',
    fontWeight: weight || '700',
    color: color || NC.CSS.white,
  };
};

NC.bodyStyle = function (size, color, weight) {
  return {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: size + 'px',
    fontStyle: 'normal',
    fontWeight: weight || '600',
    color: color || NC.CSS.white,
  };
};
