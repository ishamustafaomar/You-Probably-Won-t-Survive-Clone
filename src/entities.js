// Player, enemies, bosses, projectiles, particles.

import { TILE, PLAYER_CFG, ENEMIES, BOSSES, WEAPONS, PALETTE } from './constants.js';

const TAU = Math.PI * 2;
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

function drawShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(30,30,40,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.45, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------- particles
export class FX {
  constructor() { this.parts = []; this.texts = []; }

  spark(x, y, color, n = 6, speed = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.4 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, ttl: 0.35, color, size: 3 });
    }
  }
  puff(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 40 * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: 0, ttl: 0.5, color, size: 4 });
    }
  }
  boom(x, y, r) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU, s = r * (1.2 + Math.random() * 2.2);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, ttl: 0.45,
        color: ['#e67e22', '#f1c40f', '#c0392b', '#7f8c8d'][i % 4], size: 5,
      });
    }
  }
  text(x, y, str, color = '#fff') {
    this.texts.push({ x, y, str, color, t: 0, ttl: 1.0 });
  }

  update(dt) {
    for (const p of this.parts) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.9; p.vy *= 0.9;
    }
    this.parts = this.parts.filter(p => p.t < p.ttl);
    for (const t of this.texts) { t.t += dt; t.y -= 22 * dt; }
    this.texts = this.texts.filter(t => t.t < t.ttl);
  }

  draw(ctx, cam) {
    for (const p of this.parts) {
      ctx.globalAlpha = 1 - p.t / p.ttl;
      ctx.fillStyle = p.color;
      const s = p.size * (1 - p.t / p.ttl * 0.5);
      ctx.fillRect(p.x - cam.x - s / 2, p.y - cam.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    for (const t of this.texts) {
      ctx.globalAlpha = 1 - t.t / t.ttl;
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x - cam.x, t.y - cam.y);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- projectiles
export class Projectile {
  // kind: bullet | flame | rocket | lava | slimeball | bossBullet
  constructor(kind, x, y, angle, cfg) {
    Object.assign(this, {
      kind, x, y, t: 0,
      vx: Math.cos(angle) * cfg.speed,
      vy: Math.sin(angle) * cfg.speed,
      dmg: cfg.dmg, ttl: cfg.ttl ?? 1.6, pierce: cfg.pierce ?? 0,
      headshot: cfg.headshot ?? false, aoe: cfg.aoe ?? 0, selfDmg: cfg.selfDmg ?? 0,
      hostile: cfg.hostile ?? false, hit: new Set(), dead: false,
      slow: cfg.slow ?? null, breaksWood: cfg.breaksWood ?? false,
    });
  }

  update(dt, game) {
    this.t += dt;
    if (this.t > this.ttl) { this.expire(game); return; }
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / 8));
    for (let i = 0; i < steps && !this.dead; i++) {
      this.x += this.vx * dt / steps;
      this.y += this.vy * dt / steps;
      this.collide(game);
    }
  }

  expire(game) {
    if (this.kind === 'rocket') this.explode(game);
    this.dead = true;
  }

  collide(game) {
    const { world } = game;
    const c = Math.floor(this.x / TILE), r = Math.floor(this.y / TILE);
    // world obstacles
    const ob = world.obstacleAt(c, r);
    if (ob && ob.type !== 'sapling') {
      if (this.kind === 'rocket') { this.explode(game); return; }
      if (this.kind === 'lava' && (ob.type === 'tree' || (ob.type === 'wall' && ob.kind === 'wood'))) {
        // lava blasts burn straight through wood and trees
        game.damageObstacle(ob, 99);
        game.fx.spark(this.x, this.y, PALETTE.lavaBlast, 5);
        return; // keeps flying
      }
      // bullets and flames are simply blocked by obstacles
      game.fx.spark(this.x, this.y, '#c9c084', 4);
      this.dead = true;
      return;
    }
    if (this.hostile) {
      // hit the player
      const p = game.player;
      if (!p.dead && dist2(this.x, this.y, p.x, p.y) < (p.radius + 4) ** 2) {
        if (this.slow) p.applySlow(this.slow.factor, this.slow.dur);
        if (this.dmg > 0) game.hurtPlayer(this.dmg, this.x, this.y);
        game.fx.spark(this.x, this.y, this.kind === 'lava' ? PALETTE.lavaBlast : '#8fd14f', 6);
        this.dead = true;
      }
    } else {
      for (const e of game.enemies) {
        if (e.dead || this.hit.has(e)) continue;
        if (e.invulnerable) continue;   // shots pass through phased ghosts
        const rad = e.radius + (this.kind === 'flame' ? 6 : 3);
        if (dist2(this.x, this.y, e.x, e.y) < rad * rad) {
          if (this.kind === 'rocket') { this.explode(game); return; }
          let dmg = this.dmg;
          let head = false;
          if (this.headshot && !e.isBoss && this.y < e.y - e.radius * 0.35) { dmg = 999; head = true; }
          const dealt = game.damageEnemy(e, dmg, { bullet: this.kind !== 'flame', flame: this.kind === 'flame' });
          if (dealt && head) game.fx.text(e.x, e.y - e.radius - 8, 'HEADSHOT!', '#f1c40f');
          this.hit.add(e);
          if (this.pierce-- <= 0) { this.dead = true; }
          return;
        }
      }
    }
  }

  explode(game) {
    if (this.dead) return;
    this.dead = true;
    game.explode(this.x, this.y, this.aoe, this.dmg, this.selfDmg);
  }

  draw(ctx, cam, S) {
    const x = this.x - cam.x, y = this.y - cam.y;
    if (this.kind === 'flame') {
      const s = 14 + this.t * 30;
      ctx.globalAlpha = Math.max(0, 1 - this.t / this.ttl);
      ctx.drawImage(S.flame, x - s / 2, y - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else if (this.kind === 'rocket') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 4);
      ctx.drawImage(S.bomb, -8, -8, 16, 16);
      ctx.restore();
      game_trail(ctx, x, y);
    } else if (this.kind === 'lava') {
      const s = 16 + Math.sin(this.t * 20) * 3;
      ctx.drawImage(S.flameBig, x - s / 2, y - s / 2, s, s);
    } else if (this.kind === 'slimeball') {
      ctx.fillStyle = PALETTE.slime;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = this.hostile ? '#e74c3c' : '#f4f1de';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
}

function game_trail(ctx, x, y) {
  ctx.fillStyle = 'rgba(230,126,34,0.6)';
  ctx.fillRect(x - 2 + (Math.random() * 6 - 3), y - 2 + (Math.random() * 6 - 3), 4, 4);
}

// ---------------------------------------------------------------- player
export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = 12;
    this.hearts = PLAYER_CFG.maxHearts;
    this.maxHearts = PLAYER_CFG.maxHearts;
    this.speed = PLAYER_CFG.speed;
    this.aim = 0;
    this.dead = false;
    this.invuln = 0;
    this.slowT = 0; this.slowF = 1;
    this.wood = 0; this.stone = 0; this.saplings = 0;
    this.fireCd = 0;
    this.swing = 0;                   // melee swing animation timer
    this.kb = { x: 0, y: 0 };         // knockback velocity
    this.bonus = { dmg: 1, rof: 1, speed: 1 };
    this.facing = 1;
  }

  applySlow(factor, dur) { this.slowF = factor; this.slowT = dur; }

  update(dt, game) {
    const { input, world } = game;
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.swing = Math.max(0, this.swing - dt);
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }

    let dx = (input.down('KeyD') || input.down('ArrowRight')) - (input.down('KeyA') || input.down('ArrowLeft'));
    let dy = (input.down('KeyS') || input.down('ArrowDown')) - (input.down('KeyW') || input.down('ArrowUp'));
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      const sp = this.speed * this.slowF * this.bonus.speed;
      this.x += (dx / l) * sp * dt;
      this.y += (dy / l) * sp * dt;
    }
    // knockback decay
    this.x += this.kb.x * dt; this.y += this.kb.y * dt;
    this.kb.x *= Math.pow(0.02, dt); this.kb.y *= Math.pow(0.02, dt);

    [this.x, this.y] = world.collide(this.x, this.y, this.radius);
    this.x = Math.max(8, Math.min(world.w - 8, this.x));
    this.y = Math.max(8, Math.min(world.h - 8, this.y));

    const mx = input.mouse.x + game.cam.x, my = input.mouse.y + game.cam.y;
    this.aim = Math.atan2(my - this.y, mx - this.x);
    this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
  }

  draw(ctx, cam, S, game) {
    const x = this.x - cam.x, y = this.y - cam.y;
    drawShadow(ctx, x, y + 12, 11);
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.facing, 1);
    ctx.drawImage(S.player, -14, -14, 28, 28);
    ctx.restore();
    ctx.globalAlpha = 1;

    // held item
    const item = game.currentItem();
    if (item && item.sprite) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.aim + (this.swing > 0 ? Math.sin(this.swing * 25) * 0.9 : 0));
      const flip = Math.cos(this.aim) < 0;
      if (flip) ctx.scale(1, -1);
      ctx.drawImage(S[item.sprite], 6, -8, 18, 18);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- enemies
let eid = 0;
export class Enemy {
  constructor(type, x, y, wave = 1) {
    const cfg = ENEMIES[type];
    this.id = eid++;
    this.type = type; this.cfg = cfg;
    this.x = x; this.y = y;
    const hpScale = 1 + Math.max(0, wave - 1) * 0.06;
    this.hp = cfg.hp * hpScale; this.maxHp = this.hp;
    this.speed = cfg.speed;
    this.radius = 12 * cfg.scale;
    this.dead = false;
    this.attackCd = 0;
    this.shotCd = (cfg.shotCd ?? 0) * Math.random();
    this.phase = 'chase';                 // ghost: chase|phased
    this.phaseT = 2 + Math.random() * 2;
    this.burnT = 0;
    this.isBoss = false;
    this.flash = 0;
  }

  get bulletImmune() {
    return this.cfg.bulletImmune || (this.type === 'ghost' && this.phase === 'phased');
  }
  get invulnerable() { return this.type === 'ghost' && this.phase === 'phased'; }

  // burn DoT, ticked by the game for every enemy (bosses included)
  tickBurn(dt, game) {
    if (this.burnT <= 0 || this.dead) return;
    this.burnT -= dt;
    if (!this.invulnerable) {
      this.hp -= dt * 1.2;
      if (Math.random() < dt * 8) game.fx.spark(this.x, this.y - 8, '#e67e22', 1, 30);
      if (this.hp <= 0) game.killEnemy(this, true);
    }
  }

  update(dt, game) {
    const { player, world } = game;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.flash = Math.max(0, this.flash - dt);

    if (this.type === 'ghost') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        this.phase = this.phase === 'chase' ? 'phased' : 'chase';
        this.phaseT = this.phase === 'phased' ? 3 : 4;
      }
    }

    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;

    // ranged enemies stop at range and shoot
    const rng = this.cfg.range;
    let holdPosition = false;
    if (rng && d < rng && !player.dead) {
      this.shotCd -= dt;
      if (this.shotCd <= 0) {
        this.shotCd = this.cfg.shotCd;
        const a = Math.atan2(dy, dx);
        if (this.type === 'lava') {
          game.projectiles.push(new Projectile('lava', this.x, this.y, a, {
            speed: this.cfg.blastSpeed, dmg: this.cfg.blastDmg, ttl: 3.2, hostile: true, breaksWood: true,
          }));
          game.audio.play('lava');
        } else if (this.type === 'slime') {
          game.projectiles.push(new Projectile('slimeball', this.x, this.y, a, {
            speed: 170, dmg: 0, ttl: 2.0, hostile: true,
            slow: { factor: this.cfg.slowFactor, dur: this.cfg.slowDur },
          }));
        }
      }
      holdPosition = this.type === 'lava';   // lava monster stands still while in range
    }

    // movement
    const sp = holdPosition ? 0 : this.speed * (this.phase === 'phased' ? 1.2 : 1);
    const nx = this.x + (dx / d) * sp * dt;
    const ny = this.y + (dy / d) * sp * dt;
    if (this.phase === 'phased') {
      this.x = nx; this.y = ny;   // ghosts float through everything
    } else {
      const oldX = this.x, oldY = this.y;
      this.x = nx; this.y = ny;
      [this.x, this.y] = world.collide(this.x, this.y, this.radius * 0.85);
      // blocked? chew on the obstacle in our way
      const moved = Math.hypot(this.x - oldX, this.y - oldY);
      if (moved < sp * dt * 0.35 && this.cfg.blockDps > 0) {
        const c = Math.floor((this.x + (dx / d) * TILE * 0.8) / TILE);
        const r = Math.floor((this.y + (dy / d) * TILE * 0.8) / TILE);
        const ob = world.obstacleAt(c, r);
        if (ob && ob.type !== 'sapling' && this.attackCd <= 0) {
          this.attackCd = 1 / this.cfg.blockDps;
          game.damageObstacle(ob, 1);
          game.fx.spark(c * TILE + TILE / 2, r * TILE + TILE / 2, '#c9c084', 3);
        }
      }
    }

    // contact damage
    if (!player.dead && this.cfg.dmg > 0 && d < this.radius + player.radius && this.attackCd <= 0) {
      this.attackCd = 0.8;
      game.hurtPlayer(this.cfg.dmg, this.x, this.y);
    }
  }

  draw(ctx, cam, S, game) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const s = 28 * this.cfg.scale;
    const spr = {
      zombie: S.zombie, skeleton: S.skeleton, mini: S.zombie, big: S.zombie,
      ghost: S.ghost, lava: S.lava, slime: S.slime, armored: S.armored,
    }[this.type];
    if (this.type !== 'ghost') drawShadow(ctx, x, y + s * 0.42, s * 0.4);
    if (this.type === 'ghost' && this.phase === 'phased') ctx.globalAlpha = 0.45;
    ctx.save();
    ctx.translate(x, y);
    if (this.flash > 0) { ctx.filter = 'brightness(2.2)'; }
    ctx.scale(game.player.x < this.x ? -1 : 1, 1);
    ctx.drawImage(spr, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.hp < this.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - 14, y - s / 2 - 8, 28, 4);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(x - 14, y - s / 2 - 8, 28 * Math.max(0, this.hp / this.maxHp), 4);
    }
  }
}

// ---------------------------------------------------------------- bosses
export class BigZombieBoss extends Enemy {
  constructor(x, y, wave) {
    super('big', x, y, 1);
    const cfg = BOSSES.bigZombie;
    this.bossCfg = cfg;
    this.isBoss = true;
    this.name = 'Big Zombie';
    this.hp = this.maxHp = cfg.hp + cfg.hpPerWave * wave;
    this.speed = cfg.speed;
    this.radius = 12 * cfg.scale;
    this.state = 'roam'; this.stateT = cfg.roamTime;
    this.dashA = 0;
  }

  update(dt, game) {
    const { player, world } = game;
    const cfg = this.bossCfg;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.stateT -= dt;

    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;

    if (this.state === 'roam') {
      this.x += (dx / d) * cfg.speed * dt;
      this.y += (dy / d) * cfg.speed * dt;
      this.crush(game);
      [this.x, this.y] = world.collide(this.x, this.y, this.radius * 0.7);   // stay off the water
      if (this.stateT <= 0) {
        this.state = 'telegraph'; this.stateT = cfg.telegraph;
        // spawns regular zombies before it dashes
        for (let i = 0; i < cfg.minionsPerDash; i++) {
          const a = Math.random() * TAU;
          game.spawnEnemy('zombie', this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50);
        }
      }
    } else if (this.state === 'telegraph') {
      if (this.stateT <= 0) {
        this.state = 'dash'; this.stateT = cfg.dashTime;
        this.dashA = Math.atan2(dy, dx);
        game.audio.play('dash');
      }
    } else if (this.state === 'dash') {
      this.x += Math.cos(this.dashA) * cfg.dashSpeed * dt;
      this.y += Math.sin(this.dashA) * cfg.dashSpeed * dt;
      this.crush(game);
      [this.x, this.y] = world.collide(this.x, this.y, this.radius * 0.7);
      if (this.stateT <= 0) { this.state = 'roam'; this.stateT = cfg.roamTime; }
    }

    this.x = Math.max(16, Math.min(world.w - 16, this.x));
    this.y = Math.max(16, Math.min(world.h - 16, this.y));

    if (!player.dead && d < this.radius + player.radius && this.attackCd <= 0) {
      this.attackCd = 0.9;
      game.hurtPlayer(cfg.dmg, this.x, this.y, cfg.knockback);
    }
  }

  // destroys any obstacle it collides with
  crush(game) {
    const c0 = Math.floor((this.x - this.radius) / TILE), c1 = Math.floor((this.x + this.radius) / TILE);
    const r0 = Math.floor((this.y - this.radius) / TILE), r1 = Math.floor((this.y + this.radius) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ob = game.world.obstacleAt(c, r);
      if (ob) {
        game.world.removeObstacle(ob);
        game.fx.puff(c * TILE + 16, r * TILE + 16, '#8d6e4a');
        game.shake(4);
      }
    }
  }

  draw(ctx, cam, S, game) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const s = 28 * this.bossCfg.scale;
    ctx.save();
    ctx.translate(x, y);
    if (this.state === 'telegraph' && Math.floor(this.stateT * 10) % 2 === 0) ctx.filter = 'brightness(2.5)';
    else if (this.flash > 0) ctx.filter = 'brightness(2.2)';
    ctx.scale(game.player.x < this.x ? -1 : 1, 1);
    ctx.drawImage(S.zombie, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

export class HybridZombieBoss extends Enemy {
  constructor(x, y, wave) {
    super('zombie', x, y, 1);
    const cfg = BOSSES.hybrid;
    this.bossCfg = cfg;
    this.isBoss = true;
    this.name = 'Hybrid Zombie';
    this.hp = this.maxHp = cfg.hp + cfg.hpPerWave * wave;
    this.radius = 12 * cfg.scale;
    this.state = 'player'; this.stateT = cfg.playerStateTime;
    this.shotCd = 1;
    this.chopCd = 0;
  }

  // called by game when the player fires a bullet
  onPlayerShot(game) {
    if (this.state !== 'player' || this.dead) return;
    if (Math.random() < this.bossCfg.blockOnShotChance) {
      // place a wooden block between itself and the player
      const a = Math.atan2(game.player.y - this.y, game.player.x - this.x);
      const c = Math.floor((this.x + Math.cos(a) * TILE * 1.2) / TILE);
      const r = Math.floor((this.y + Math.sin(a) * TILE * 1.2) / TILE);
      const p = game.player;
      const onPlayer = c === Math.floor(p.x / TILE) && r === Math.floor(p.y / TILE);
      if (!onPlayer && game.world.canPlaceObstacle(c, r)) {
        game.world.addWall(c, r, 'wood');
        game.fx.puff(c * TILE + 16, r * TILE + 16, '#8d6e4a', 4);
      }
    }
  }

  update(dt, game) {
    const { player, world } = game;
    const cfg = this.bossCfg;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.chopCd = Math.max(0, this.chopCd - dt);
    this.stateT -= dt;
    if (this.stateT <= 0) {
      this.state = this.state === 'player' ? 'zombie' : 'player';
      this.stateT = this.state === 'player' ? cfg.playerStateTime : cfg.zombieStateTime;
      game.fx.text(this.x, this.y - 40, this.state === 'player' ? 'PLAYER MODE' : 'ZOMBIE MODE', '#f4f1de');
    }

    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 0.001;

    if (this.state === 'player') {
      // keep distance, shoot; chop anything in the way; axe up close
      const want = cfg.keepDistance;
      const dir = d > want ? 1 : (d < want * 0.6 ? -0.7 : 0);
      const oldX = this.x, oldY = this.y;
      this.x += (dx / d) * cfg.speed * dir * dt;
      this.y += (dy / d) * cfg.speed * dir * dt;
      [this.x, this.y] = world.collide(this.x, this.y, this.radius * 0.85);

      // chop obstacles blocking it (fast, like a player with an axe)
      if (Math.hypot(this.x - oldX, this.y - oldY) < 2 * dt * cfg.speed * Math.abs(dir) * 0.3 && this.chopCd <= 0) {
        const c = Math.floor((this.x + (dx / d) * TILE) / TILE);
        const r = Math.floor((this.y + (dy / d) * TILE) / TILE);
        const ob = world.obstacleAt(c, r);
        if (ob && ob.type !== 'sapling') {
          this.chopCd = 0.5;
          game.damageObstacle(ob, 2);
          game.fx.spark(c * TILE + 16, r * TILE + 16, '#c9c084', 4);
        }
      }

      this.shotCd -= dt;
      if (this.shotCd <= 0 && d < 420 && !player.dead) {
        this.shotCd = cfg.shotCd;
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.08;
        game.projectiles.push(new Projectile('bullet', this.x, this.y, a, {
          speed: 380, dmg: cfg.shotDmg, ttl: 1.6, hostile: true,
        }));
        game.audio.play('shoot');
      }
      if (!player.dead && d < cfg.axeRange && this.attackCd <= 0) {
        this.attackCd = 0.8;
        game.hurtPlayer(cfg.axeDmg, this.x, this.y);
      }
    } else {
      // plain zombie behaviour
      const oldX = this.x, oldY = this.y;
      this.x += (dx / d) * 45 * dt;
      this.y += (dy / d) * 45 * dt;
      [this.x, this.y] = world.collide(this.x, this.y, this.radius * 0.85);
      if (Math.hypot(this.x - oldX, this.y - oldY) < 45 * dt * 0.35 && this.attackCd <= 0) {
        const c = Math.floor((this.x + (dx / d) * TILE * 0.8) / TILE);
        const r = Math.floor((this.y + (dy / d) * TILE * 0.8) / TILE);
        const ob = world.obstacleAt(c, r);
        if (ob && ob.type !== 'sapling') {
          this.attackCd = 1.0;
          game.damageObstacle(ob, 1);
        }
      }
      if (!player.dead && d < this.radius + player.radius && this.attackCd <= 0) {
        this.attackCd = 0.8;
        game.hurtPlayer(1, this.x, this.y);
      }
    }
  }

  draw(ctx, cam, S, game) {
    const x = this.x - cam.x, y = this.y - cam.y;
    const s = 28 * this.bossCfg.scale;
    ctx.save();
    ctx.translate(x, y);
    if (this.flash > 0) ctx.filter = 'brightness(2.2)';
    ctx.scale(game.player.x < this.x ? -1 : 1, 1);
    ctx.drawImage(this.state === 'player' ? S.hybridP : S.zombie, -s / 2, -s / 2, s, s);
    ctx.restore();
    if (this.state === 'player') {
      // holds a gun pointed at the player
      const a = Math.atan2(game.player.y - this.y, game.player.x - this.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      if (Math.cos(a) < 0) ctx.scale(1, -1);
      ctx.drawImage(S.pistol, 8, -7, 16, 16);
      ctx.restore();
    }
  }
}
