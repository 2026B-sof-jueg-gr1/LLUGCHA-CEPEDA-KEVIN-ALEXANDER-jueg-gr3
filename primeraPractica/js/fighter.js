/* =========================================================================
   NEON CLASH — luchador (física, estados, ataques y animaciones)
   ========================================================================= */
'use strict';

class Fighter {
  constructor(scene, opts) {
    this.scene = scene;
    this.key = opts.key;                 // 'kai' | 'raze'
    this.displayName = opts.displayName;
    this.isCPU = !!opts.isCPU;
    this.accent = opts.accent;
    this.accentCss = opts.accentCss;
    this.animPrefix = opts.key;
    this.speed = 300;
    this.speedScale = 1;

    this.sprite = scene.physics.add.sprite(opts.x, NC.FLOOR, opts.key);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(1.15);
    this.sprite.body.setSize(52, 138);
    this.sprite.body.setOffset(54, 22);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setMaxVelocity(560, 1900);
    this.sprite.setDepth(10);

    this.facing = opts.facing || 1;
    this.sprite.setFlipX(this.facing === -1);

    this.health = NC.MAX_HEALTH;
    this.meter = 0;
    this.roundWins = 0;

    this.state = 'idle';
    this.stateTime = 0;
    this.attack = null;
    this.attackData = null;
    this.attackTime = 0;
    this.hasHit = false;
    this.hasSpawned = false;
    this.hitstun = 0;
    this.blockStun = 0;
    this.invuln = 0;
    this.cooldowns = { punch: 0, kick: 0, special: 0, airkick: 0 };
    this.wasGrounded = true;
    this.lastInput = this.emptyInput();

    this.shadow = scene.add.image(opts.x, NC.FLOOR + 2, 'shadow')
      .setDepth(3)
      .setAlpha(0.55)
      .setScale(1.05, 0.9);
    this.aura = scene.add.image(opts.x, NC.FLOOR - 90, 'glow')
      .setDepth(2)
      .setTint(this.accent)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.13)
      .setScale(2.6, 2.8);

    this.playAnim('idle', true);
  }

  emptyInput() {
    return {
      left: false, right: false, up: false, down: false,
      punch: false, kick: false, block: false, special: false,
    };
  }

  playAnim(name, ignoreIfPlaying) {
    const key = this.animPrefix + '-' + name;
    if (!this.scene.anims.exists(key)) return;
    const current = this.sprite.anims.currentAnim;
    if (ignoreIfPlaying && current && current.key === key) return;
    this.sprite.play(key, ignoreIfPlaying === false ? false : true);
  }

  canAct() {
    return (
      this.state !== 'ko' &&
      this.state !== 'win' &&
      !this.attack &&
      this.hitstun <= 0 &&
      this.scene.roundState === 'fighting'
    );
  }

  canAttack(kind, airborne) {
    if (!this.canAct()) return false;
    if (this.cooldowns[kind] > 0) return false;
    if (kind === 'airkick' && this.grounded) return false;
    if (kind !== 'airkick' && !this.grounded) return false;
    if (kind === 'special' && this.meter < NC.ATTACKS.special.cost) return false;
    return true;
  }

  startAttack(kind, airborne) {
    if (!this.canAttack(kind, airborne)) return false;
    const data = NC.ATTACKS[kind];
    if (kind === 'special') {
      this.meter = Math.max(0, this.meter - data.cost);
      this.scene.onMeterSpent(this);
    }
    this.attack = kind;
    this.attackData = data;
    this.attackTime = 0;
    this.hasHit = false;
    this.hasSpawned = false;
    this.state = 'attack';
    this.stateTime = 0;
    this.cooldowns[kind] = data.cooldown;
    if (!airborne) {
      this.sprite.setVelocityX(0);
    }
    this.playAnim(kind === 'airkick' ? 'kick' : kind, false);
    if (kind === 'special') {
      NCAudio.play('special', 0.55);
    } else if (kind === 'kick' || kind === 'airkick') {
      NCAudio.play('kick', 0.42);
    } else {
      NCAudio.play('punch', 0.4);
    }
    return true;
  }

  endAttack() {
    this.attack = null;
    this.attackData = null;
    this.attackTime = 0;
    this.hasHit = false;
    this.hasSpawned = false;
    if (this.state === 'ko' || this.state === 'win') return;
    if (this.grounded) {
      this.state = 'idle';
      this.playAnim('idle', true);
    } else {
      this.state = 'jump';
      this.playAnim('jump', true);
    }
  }

  updateAttack(delta, opponent) {
    if (!this.attack) return;
    this.attackTime += delta;
    const d = this.attackData;
    const activeStart = d.startup;
    const activeEnd = d.startup + d.active;

    if (this.attackTime >= activeStart && this.attackTime <= activeEnd) {
      if (this.attack === 'special') {
        if (!this.hasSpawned) {
          this.hasSpawned = true;
          this.scene.spawnProjectile(this);
        }
      } else if (!this.hasHit) {
        this.tryHit(opponent, d);
      }
    }

    if (this.attackTime >= activeStart + d.active + d.recovery) {
      this.endAttack();
    }
  }

  tryHit(opponent, data) {
    if (opponent.state === 'ko' || opponent.state === 'win') return;
    const dx = (opponent.sprite.x - this.sprite.x) * this.facing;
    const dy = Math.abs(opponent.sprite.y - this.sprite.y);
    const reach = data.range + 32;
    if (dx > -18 && dx < reach && dy < 175) {
      const result = opponent.receiveHit(this, this.attack, this.facing);
      if (result) {
        this.hasHit = true;
        this.scene.onAttackHit(this, opponent, this.attack, result);
      }
    }
  }

  receiveHit(attacker, kind, dir) {
    if (this.state === 'ko' || this.state === 'win') return false;
    if (this.invuln > 0) return false;
    if (this.scene.roundState !== 'fighting') return false;

    const data = NC.ATTACKS[kind] || NC.ATTACKS.punch;
    const blocking = this.state === 'block' && this.blockStun <= 0;
    const hitX = this.sprite.x + (dir > 0 ? -20 : 20);
    const hitY = this.sprite.y - 105;

    if (blocking) {
      const chip = Math.max(1, Math.round(data.damage * 0.18));
      this.health = Math.max(0, this.health - chip);
      this.meter = Math.min(NC.MAX_METER, this.meter + data.meter * 0.35);
      attacker.meter = Math.min(NC.MAX_METER, attacker.meter + data.meter * 0.65);
      this.blockStun = 150;
      this.invuln = 70;
      this.sprite.setVelocityX(dir * 95);
      this.playAnim('block', true);
      this.sprite.setTintFill(0xbfefff);
      this.scene.time.delayedCall(55, () => this.sprite.clearTint());
      NCAudio.play('block', 0.45, Phaser.Math.FloatBetween(0.96, 1.05));
      this.scene.onBlock(this, attacker, hitX, hitY, kind);
      return 'block';
    } else {
      this.health = Math.max(0, this.health - data.damage);
      this.meter = Math.min(NC.MAX_METER, this.meter + data.meter * 0.5);
      attacker.meter = Math.min(NC.MAX_METER, attacker.meter + data.meter);
      this.hitstun = data.hitstun;
      this.state = 'hurt';
      this.stateTime = 0;
      this.attack = null;
      this.attackData = null;
      this.invuln = 110;
      this.sprite.setVelocityX(dir * data.knockback);
      if (data.lift) this.sprite.setVelocityY(-data.lift);
      this.playAnim('hurt', false);
      this.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(60, () => {
        if (this.state !== 'ko') this.sprite.clearTint();
      });
      NCAudio.play('hit', 0.55, Phaser.Math.FloatBetween(0.94, 1.06));
      this.scene.onHit(this, attacker, hitX, hitY, kind);
      if (this.health <= 0) {
        this.scene.onKO(this, attacker);
      }
    }
    return 'hit';
  }

  update(delta, input, opponent) {
    if (!this.sprite || !this.sprite.body) return;

    for (const k in this.cooldowns) {
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - delta);
    }
    this.invuln = Math.max(0, this.invuln - delta);
    this.hitstun = Math.max(0, this.hitstun - delta);
    this.blockStun = Math.max(0, this.blockStun - delta);
    this.stateTime += delta;

    const body = this.sprite.body;
    const grounded = body.blocked.down || body.touching.down;
    this.grounded = grounded;

    // aterrizaje
    if (grounded && !this.wasGrounded) {
      if (this.attack === 'airkick') {
        this.endAttack();
      }
      if (this.state === 'jump' || this.state === 'attack') {
        this.state = 'idle';
        this.playAnim('idle', true);
      }
      this.scene.onLand(this);
    }
    this.wasGrounded = grounded;

    // KO / victoria: sin control
    if (this.state === 'ko' || this.state === 'win') {
      this.sprite.setVelocityX(0);
      if (this.state === 'ko') this.sprite.setVelocityY(0);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // durante la intro o el final no se aceptan entradas
    if (this.scene.roundState !== 'fighting') {
      this.sprite.setVelocityX(0);
      if (grounded && this.state !== 'hurt') {
        this.state = 'idle';
        this.playAnim('idle', true);
      }
      this.lastInput = Object.assign({}, input);
      return;
    }

    // mirar siempre al rival
    if (this.hitstun <= 0 && !this.attack && grounded) {
      const nf = opponent.sprite.x >= this.sprite.x ? 1 : -1;
      if (nf !== this.facing) {
        this.facing = nf;
        this.sprite.setFlipX(nf === -1);
      }
    }

    // aturdimiento
    if (this.hitstun > 0) {
      this.state = 'hurt';
      this.sprite.setVelocityX(this.sprite.body.velocity.x * 0.9);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // ataque en curso
    if (this.attack) {
      this.updateAttack(delta, opponent);
      this.lastInput = Object.assign({}, input);
      return;
    }

    const pressed = {
      up: input.up && !this.lastInput.up,
      down: input.down && !this.lastInput.down,
      punch: input.punch && !this.lastInput.punch,
      kick: input.kick && !this.lastInput.kick,
      block: input.block && !this.lastInput.block,
      special: input.special && !this.lastInput.special,
    };

    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;

    // salto
    if (pressed.up && grounded) {
      this.sprite.setVelocityY(-980);
      if (dir !== 0) this.sprite.setVelocityX(dir * 260);
      this.state = 'jump';
      this.playAnim('jump', true);
      this.scene.onJump(this);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // ataque aéreo
    if (!grounded && (pressed.punch || pressed.kick) && this.canAttack('airkick', true)) {
      this.startAttack('airkick', true);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // bloqueo
    if (input.block && grounded && this.blockStun <= 0) {
      this.state = 'block';
      this.sprite.setVelocityX(0);
      this.playAnim('block', true);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // ataques en suelo
    if (grounded && pressed.special) {
      if (this.meter >= NC.ATTACKS.special.cost) {
        this.startAttack('special');
        this.lastInput = Object.assign({}, input);
        return;
      }
      this.scene.onNoMeter(this);
    }
    if (grounded && pressed.punch) {
      this.startAttack('punch');
      this.lastInput = Object.assign({}, input);
      return;
    }
    if (grounded && pressed.kick) {
      this.startAttack('kick');
      this.lastInput = Object.assign({}, input);
      return;
    }

    // agacharse
    if (input.down && grounded) {
      this.state = 'crouch';
      this.sprite.setVelocityX(0);
      this.playAnim('crouch', true);
      this.lastInput = Object.assign({}, input);
      return;
    }

    // movimiento
    if (!grounded) {
      if (dir !== 0) this.sprite.setVelocityX(dir * 245);
      this.state = 'jump';
      this.playAnim('jump', true);
    } else if (dir !== 0) {
      const forward = dir === this.facing;
      this.sprite.setVelocityX(dir * this.speed * this.speedScale * (forward ? 1 : 0.8));
      this.state = 'walk';
      this.playAnim('walk', true);
    } else {
      this.sprite.setVelocityX(0);
      this.state = 'idle';
      this.playAnim('idle', true);
    }

    this.lastInput = Object.assign({}, input);
  }

  updateVisuals() {
    if (!this.sprite) return;
    const x = this.sprite.x;
    const y = this.sprite.y;
    const height = Math.max(0, NC.FLOOR - y);
    const f = Math.max(0.35, 1 - height / 520);
    this.shadow.x = x;
    this.shadow.y = NC.FLOOR + 2;
    this.shadow.setScale(1.05 * f, 0.9 * f);
    this.shadow.setAlpha(0.55 * f);

    this.aura.x = x;
    this.aura.y = y - 95;
    const pulse = 1 + Math.sin(this.scene.time.now / 320) * 0.04;
    this.aura.setScale(2.6 * pulse, 2.8 * pulse);
    if (this.state === 'ko') {
      this.aura.setAlpha(0.04);
    } else if (this.attack) {
      this.aura.setAlpha(0.22);
    } else {
      this.aura.setAlpha(0.12);
    }
  }

  reset(x, facing) {
    this.health = NC.MAX_HEALTH;
    this.state = 'idle';
    this.stateTime = 0;
    this.attack = null;
    this.attackData = null;
    this.attackTime = 0;
    this.hasHit = false;
    this.hasSpawned = false;
    this.hitstun = 0;
    this.blockStun = 0;
    this.invuln = 0;
    this.cooldowns = { punch: 0, kick: 0, special: 0, airkick: 0 };
    this.lastInput = this.emptyInput();
    this.facing = facing;
    this.sprite.setFlipX(facing === -1);
    this.sprite.clearTint();
    this.sprite.setAlpha(1);
    this.sprite.setActive(true).setVisible(true);
    this.sprite.body.enable = true;
    this.sprite.setPosition(x, NC.FLOOR);
    this.sprite.body.reset(x, NC.FLOOR);
    this.sprite.setVelocity(0, 0);
    this.wasGrounded = true;
    this.grounded = true;
    this.playAnim('idle', false);
    this.updateVisuals();
  }

  playKO() {
    this.state = 'ko';
    this.attack = null;
    this.attackData = null;
    this.hitstun = 0;
    this.sprite.setVelocity(0, 0);
    this.sprite.setPosition(this.sprite.x, NC.FLOOR);
    this.sprite.body.reset(this.sprite.x, NC.FLOOR);
    this.playAnim('ko', false);
    this.sprite.clearTint();
  }

  playWin() {
    if (this.state === 'ko') return;
    this.state = 'win';
    this.attack = null;
    this.attackData = null;
    this.sprite.setVelocity(0, 0);
    this.playAnim('win', true);
  }

  get healthRatio() {
    return Phaser.Math.Clamp(this.health / NC.MAX_HEALTH, 0, 1);
  }

  get meterRatio() {
    return Phaser.Math.Clamp(this.meter / NC.MAX_METER, 0, 1);
  }
}

/* =========================================================================
   IA del rival
   ========================================================================= */
class AIController {
  constructor(fighter, opponent, difficultyKey) {
    this.f = fighter;
    this.o = opponent;
    this.diff = NC.DIFFICULTY[difficultyKey] || NC.DIFFICULTY.normal;
    this.input = fighter.emptyInput();
    this.decisionTimer = 350;
    this.blockTimer = 0;
    this.jumpTimer = 0;
    this.speedScale = this.diff.speed;
    this.f.speedScale = this.diff.speed;
  }

  reset() {
    this.input = this.f.emptyInput();
    this.decisionTimer = 400;
    this.blockTimer = 0;
    this.jumpTimer = 0;
  }

  update(delta) {
    const f = this.f;
    const o = this.o;
    const inp = this.input;

    // Los ataques son pulsos de un solo frame.
    inp.punch = false;
    inp.kick = false;
    inp.special = false;
    inp.up = false;

    if (f.state === 'ko' || f.state === 'win' || this.f.scene.roundState !== 'fighting') {
      inp.left = inp.right = inp.down = inp.block = false;
      return inp;
    }

    const dx = o.sprite.x - f.sprite.x;
    const dist = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;

    this.decisionTimer -= delta;
    this.blockTimer -= delta;
    this.jumpTimer -= delta;

    // Reacción defensiva: bloquear si el rival ataca cerca.
    if (o.attack && dist < 190 && this.blockTimer <= 0 && Math.random() < this.diff.block * 0.55) {
      this.blockTimer = 260 + Math.random() * 180;
    }
    if (this.blockTimer > 0) {
      inp.block = true;
      inp.left = inp.right = false;
      inp.down = false;
      return inp;
    }
    inp.block = false;

    // Movimiento base.
    inp.left = false;
    inp.right = false;
    inp.down = false;

    if (f.state === 'idle' || f.state === 'walk') {
      if (dist > 155) {
        if (dir < 0) inp.left = true;
        else inp.right = true;
      } else if (dist < 92) {
        // retroceder un poco para no quedar pegados
        if (dir < 0) inp.right = true;
        else inp.left = true;
      }
    }

    // Saltos de aproximación / evasión.
    if (this.jumpTimer <= 0 && dist > 170 && dist < 430 && Math.random() < 0.006) {
      inp.up = true;
      this.jumpTimer = 900;
    }

    if (this.decisionTimer > 0) return inp;
    this.decisionTimer = this.diff.reaction + Math.random() * 240;

    // Decisión de ataque.
    const canAct = f.canAct();
    if (!canAct) return inp;

    if (o.attack && dist < 175) {
      // contraataque o bloqueo
      if (Math.random() < this.diff.aggression * 0.55) {
        if (dist < 130) inp.punch = true;
        else inp.kick = true;
      }
      return inp;
    }

    if (!o.grounded && dist < 190) {
      // antiáreo
      if (Math.random() < this.diff.aggression * 0.75) inp.kick = true;
      return inp;
    }

    if (f.meter >= NC.ATTACKS.special.cost && dist > 150 && Math.random() < this.diff.special) {
      inp.special = true;
      return inp;
    }

    if (dist < 125) {
      const r = Math.random();
      if (r < 0.48 * this.diff.aggression) inp.punch = true;
      else if (r < 0.82 * this.diff.aggression) inp.kick = true;
      else if (r < 0.9) inp.block = true;
      else {
        if (dir < 0) inp.right = true;
        else inp.left = true;
      }
    } else if (dist < 195) {
      const r = Math.random();
      if (r < 0.55 * this.diff.aggression) inp.kick = true;
      else if (r < 0.8) {
        if (dir < 0) inp.left = true;
        else inp.right = true;
      } else if (r < 0.92) inp.block = true;
      else inp.punch = true;
    } else {
      // Lejos: acercarse, saltar o cargar especial.
      const r = Math.random();
      if (f.meter >= NC.ATTACKS.special.cost && r < this.diff.special) {
        inp.special = true;
      } else if (r < 0.08) {
        inp.up = true;
      } else {
        if (dir < 0) inp.left = true;
        else inp.right = true;
      }
    }

    return inp;
  }
}
