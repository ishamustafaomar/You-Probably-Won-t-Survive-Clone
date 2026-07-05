// Game orchestrator: states, combat, resources, building, upgrades, camera.

import { TILE, PLAYER_CFG, ENEMIES, WEAPONS, BUILD, XP, PALETTE } from './constants.js';
import { World, CELL } from './world.js';
import { Player, Enemy, BigZombieBoss, HybridZombieBoss, Projectile, FX, dist2 } from './entities.js';
import { WaveDirector } from './waves.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2 };

export class Game {
  constructor(canvas, input, sprites) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.S = sprites;
    this.audio = new Audio();
    this.state = STATE.TITLE;
    this.time = 0;
    this.best = Number(localStorage.getItem('ypws_best') || 0);
    this.ui = new UI(this);
    this.cam = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    this.shakeT = 0; this.shakeMag = 0;
  }

  // ------------------------------------------------------------- run lifecycle
  newRun(impossible) {
    this.impossible = impossible;
    this.world = new World();
    this.player = new Player(this.world.w / 2, this.world.h / 2);
    if (impossible) { this.player.hearts = 0.5; this.player.maxHearts = 0.5; }
    this.enemies = [];
    this.projectiles = [];
    this.placedTnt = [];
    this.fx = new FX();
    this.waves = new WaveDirector(this);
    this.score = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = XP.levelBase;
    this.pendingUpgrades = null;
    this.unlocked = new Set(['axe', 'pickaxe', 'pistol']);
    this.buildHotbar();
    this.hotbarIndex = 0;
    this.state = STATE.PLAYING;
    this.ui.toasts = [];
    this.ui.showBanner(impossible ? 'IMPOSSIBLE MODE' : 'GOOD LUCK');
  }

  buildHotbar() {
    const bar = [];
    const weaponOrder = ['axe', 'pickaxe', 'pistol', 'shotgun', 'uzi', 'sniper', 'flamethrower', 'sword', 'rocket'];
    for (const w of weaponOrder) {
      if (this.unlocked.has(w)) {
        bar.push({ kind: 'weapon', id: w, sprite: spriteKeyFor(w) });
      }
    }
    bar.push({ kind: 'build', id: 'wood', sprite: 'wallWood', count: () => this.player.wood });
    bar.push({ kind: 'build', id: 'stone', sprite: 'wallStone', count: () => this.player.stone });
    bar.push({ kind: 'sapling', id: 'sapling', sprite: 'sapling', count: () => this.player.saplings });
    if (this.unlocked.has('tnt')) bar.push({ kind: 'tnt', id: 'tnt', sprite: 'tnt' });
    this.hotbar = bar;
    if (this.hotbarIndex >= bar.length) this.hotbarIndex = 0;
  }

  currentItem() { return this.hotbar[this.hotbarIndex]; }

  xpProgress() { return Math.min(1, this.xp / this.xpNext); }

  gainXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.round(this.xpNext * XP.levelGrowth);
      // offer 3 random distinct upgrades
      const pool = [...XP.upgrades];
      const picks = [];
      while (picks.length < 3 && pool.length) {
        picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      }
      this.pendingUpgrades = picks;
      this.audio.play('levelup');
    }
  }

  applyUpgrade(u) {
    const p = this.player;
    if (u.id === 'dmg') p.bonus.dmg *= 1.15;
    if (u.id === 'rof') p.bonus.rof *= 1.12;
    if (u.id === 'speed') p.bonus.speed *= 1.08;
    if (u.id === 'heart') {
      if (this.impossible) { /* still one-hit death — a cruel joke of a pick */ }
      else { p.maxHearts += 1; p.hearts = Math.min(p.maxHearts, p.hearts + 1); }
    }
    this.pendingUpgrades = null;
    this.ui.toast('Upgraded!', u.name);
  }

  // ------------------------------------------------------------- wave hooks
  onWaveStart(wave) {
    this.ui.showBanner(`WAVE ${wave}`);
    this.audio.play('wave');
    // weapon unlock milestones with "New Weapon" toast, like the video
    for (const [id, cfg] of Object.entries(WEAPONS)) {
      if (cfg.unlockWave && cfg.unlockWave <= wave && !this.unlocked.has(id)) {
        this.unlocked.add(id);
        this.buildHotbar();
        this.ui.toast(`New ${id === 'tnt' ? 'Item' : 'Weapon'}: ${cfg.name}`,
          cfg.placeable ? 'Right-click to place it' : 'Select it in your hotbar');
        this.audio.play('unlock');
      }
    }
  }

  onWaveEnd(wave) {
    this.ui.showBanner(`WAVE ${wave} CLEARED`);
    // small heal between waves in normal mode
    if (!this.impossible) this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + 0.5);
  }

  // ------------------------------------------------------------- combat
  spawnEnemy(type, x, y) {
    this.enemies.push(new Enemy(type, x, y, this.waves.wave));
  }

  spawnBoss(kind, x, y, wave) {
    const boss = kind === 'bigZombie' ? new BigZombieBoss(x, y, wave) : new HybridZombieBoss(x, y, wave);
    this.enemies.push(boss);
    this.ui.showBanner('A BOSS APPROACHES');
  }

  damageEnemy(e, dmg, opts = {}) {
    if (e.dead || e.invulnerable) return false;
    if (e.bulletImmune && opts.bullet) {
      this.fx.spark(e.x, e.y, '#aab', 3, 50);
      return false;
    }
    e.hp -= dmg * this.player.bonus.dmg;
    e.flash = 0.1;
    if (opts.flame) e.burnT = 2;
    if (e.hp <= 0) { this.killEnemy(e); return true; }
    return true;
  }

  killEnemy(e, silent = false) {
    if (e.dead) return;
    e.dead = true;
    const score = e.isBoss ? e.bossCfg.score : e.cfg.score;
    this.score += score;
    this.gainXp(score * XP.perScore);
    this.fx.puff(e.x, e.y, e.isBoss ? PALETTE.boss : PALETTE.zombieBody, e.isBoss ? 24 : 10);
    this.fx.text(e.x, e.y - 20, `+${score}`, PALETTE.xp);
    if (!silent) this.audio.play('kill');
    if (e.isBoss) { this.shake(10); this.ui.showBanner('BOSS DEFEATED!'); }
  }

  hurtPlayer(dmg, fromX, fromY, knockback = 60) {
    const p = this.player;
    if (p.dead || p.invuln > 0) return;
    if (this.impossible) dmg = 999;           // any hit is fatal
    p.hearts -= dmg;
    p.invuln = PLAYER_CFG.hitInvuln;
    const a = Math.atan2(p.y - fromY, p.x - fromX);
    p.kb.x += Math.cos(a) * knockback * 3;
    p.kb.y += Math.sin(a) * knockback * 3;
    this.shake(6);
    this.audio.play('hurt');
    if (p.hearts <= 0) this.gameOver();
  }

  explode(x, y, radius, dmg, selfDmg) {
    this.fx.boom(x, y, radius * 0.6);
    this.shake(9);
    this.audio.play('boom');
    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.x, e.y) < (radius + e.radius) ** 2) {
        // armored zombies shrug off explosions too (melee-only per the video)
        if (!e.cfg.bulletImmune) this.damageEnemy(e, dmg, {});
        else this.fx.spark(e.x, e.y, '#aab', 4, 60);
      }
    }
    // obstacles (trees, rocks, walls) in radius
    const c0 = Math.floor((x - radius) / TILE), c1 = Math.floor((x + radius) / TILE);
    const r0 = Math.floor((y - radius) / TILE), r1 = Math.floor((y + radius) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ob = this.world.obstacleAt(c, r);
      if (!ob) continue;
      const ox = c * TILE + TILE / 2, oy = r * TILE + TILE / 2;
      if (dist2(x, y, ox, oy) < radius * radius) this.damageObstacle(ob, 99);
    }
    // the player is not spared
    if (selfDmg > 0 && !this.player.dead &&
        dist2(x, y, this.player.x, this.player.y) < (radius + this.player.radius) ** 2) {
      this.hurtPlayer(selfDmg, x, y, 120);
    }
  }

  damageObstacle(ob, dmg) {
    ob.hp -= dmg;
    if (ob.hp <= 0) {
      this.world.removeObstacle(ob);
      const x = ob.c * TILE + TILE / 2, y = ob.r * TILE + TILE / 2;
      if (ob.type === 'tree') {
        if (ob.fake) {
          // fake tree: falls on the player
          this.fx.text(x, y - 24, 'FAKE TREE!', PALETTE.boss);
          this.fx.puff(x, y, PALETTE.fakeTree, 14);
          this.score += 5; this.gainXp(5);
          if (dist2(x, y, this.player.x, this.player.y) < (TILE * 2.2) ** 2) {
            this.hurtPlayer(1, x, y, 90);
          }
        } else {
          this.fx.puff(x, y, '#7ec850');
        }
      } else if (ob.type === 'rock') {
        this.fx.puff(x, y, '#9aa0a8');
      } else {
        this.fx.puff(x, y, ob.kind === 'wood' ? '#8d6e4a' : '#9aa0a8');
      }
    }
  }

  gameOver() {
    this.player.dead = true;
    this.audio.play('die');
    this.best = Math.max(this.best, this.score);
    localStorage.setItem('ypws_best', String(this.best));
    setTimeout(() => { this.state = STATE.GAMEOVER; }, 900);
  }

  shake(mag) { this.shakeT = 0.25; this.shakeMag = Math.max(this.shakeMag, mag); }

  // ------------------------------------------------------------- player actions
  useItem(dt) {
    const p = this.player;
    const item = this.currentItem();
    if (!item || p.dead) return;
    const S = this.S;
    const aimX = this.input.mouse.x + this.cam.x;
    const aimY = this.input.mouse.y + this.cam.y;

    // left mouse: use tool / weapon
    if (this.input.mouse.left && item.kind === 'weapon') {
      const w = WEAPONS[item.id];
      if (p.fireCd <= 0) {
        p.fireCd = 1 / (w.rof * p.bonus.rof);
        if (w.melee) this.meleeSwing(item.id, w, aimX, aimY);
        else this.fireGun(item.id, w);
      }
    }

    // right mouse: build / plant / place tnt
    if (this.input.rclicked) {
      const c = Math.floor(aimX / TILE), r = Math.floor(aimY / TILE);
      const near = Math.abs(c * TILE + TILE / 2 - p.x) < TILE * 3.2 && Math.abs(r * TILE + TILE / 2 - p.y) < TILE * 3.2;
      const playerCell = c === Math.floor(p.x / TILE) && r === Math.floor(p.y / TILE);
      if (near && !playerCell) {
        if (item.kind === 'build') {
          const b = BUILD[item.id];
          if (p[b.res] >= b.cost && this.world.canPlaceObstacle(c, r)) {
            p[b.res] -= b.cost;
            this.world.addWall(c, r, item.id);
            this.audio.play('place');
          }
        } else if (item.kind === 'sapling') {
          if (p.saplings > 0 && this.world.canPlaceObstacle(c, r)) {
            p.saplings--;
            this.world.addSapling(c, r, true);
            this.audio.play('place');
          }
        } else if (item.kind === 'tnt') {
          if (this.world.canPlaceObstacle(c, r)) {
            const w = WEAPONS.tnt;
            this.placedTnt.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, t: w.fuse });
            this.audio.play('place');
          }
        }
      }
    }
  }

  meleeSwing(id, w, aimX, aimY) {
    const p = this.player;
    p.swing = 0.22;
    const a = p.aim;
    const hx = p.x + Math.cos(a) * w.range * 0.7;
    const hy = p.y + Math.sin(a) * w.range * 0.7;

    // hit enemies in an arc
    let hitSomething = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(hx, hy, e.x, e.y) < (w.range * 0.8 + e.radius) ** 2) {
        this.damageEnemy(e, w.dmg, { melee: true });
        hitSomething = true;
      }
    }

    // chop/mine the obstacle under the cursor (or straight ahead)
    let c = Math.floor(aimX / TILE), r = Math.floor(aimY / TILE);
    let ob = this.world.obstacleAt(c, r);
    const obDist = ob ? dist2(p.x, p.y, c * TILE + TILE / 2, r * TILE + TILE / 2) : Infinity;
    if (!ob || obDist > (PLAYER_CFG.reach + TILE) ** 2) {
      c = Math.floor(hx / TILE); r = Math.floor(hy / TILE);
      ob = this.world.obstacleAt(c, r);
    }
    if (ob) {
      const ox = c * TILE + TILE / 2, oy = r * TILE + TILE / 2;
      if (dist2(p.x, p.y, ox, oy) < (PLAYER_CFG.reach + TILE) ** 2) {
        if (ob.type === 'tree' && id === 'axe') {
          this.damageObstacle(ob, 1);
          this.audio.play('chop');
          if (ob.hp <= 0 && !ob.fake) {
            this.player.wood += 2 + ((Math.random() * 3) | 0);
            if (Math.random() < 0.45) this.player.saplings++;
            this.audio.play('pickup');
          }
          hitSomething = true;
        } else if (ob.type === 'rock' && id === 'pickaxe') {
          this.damageObstacle(ob, 1);
          this.audio.play('mine');
          if (ob.hp <= 0) {
            this.player.stone += 2 + ((Math.random() * 2) | 0);
            this.audio.play('pickup');
          }
          hitSomething = true;
        } else if (ob.type === 'wall' || ob.type === 'sapling') {
          this.damageObstacle(ob, 1);   // reclaim mistakes (no refund)
          this.audio.play('chop');
          hitSomething = true;
        } else if (ob.type === 'tree' || ob.type === 'rock') {
          // wrong tool: harmless bonk
          this.fx.spark(ox, oy, '#c9c084', 2, 40);
        }
      }
    }
    if (!hitSomething) this.audio.play('flame');
  }

  fireGun(id, w) {
    const p = this.player;
    const pellets = w.pellets ?? 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (w.spread ?? 0) * (Math.PI / 180);
      const a = p.aim + (Math.random() - 0.5) * 2 * spread + (pellets > 1 ? (i - (pellets - 1) / 2) * spread : 0);
      const kind = w.flame ? 'flame' : (w.rocket ? 'rocket' : 'bullet');
      const ttl = w.flame ? (w.range / w.speed) : (w.rocket ? 2.2 : 1.6);
      this.projectiles.push(new Projectile(kind, p.x + Math.cos(p.aim) * 16, p.y + Math.sin(p.aim) * 16, a, {
        speed: w.speed, dmg: w.dmg, ttl,
        pierce: w.pierce ?? 0, headshot: w.headshot ?? false,
        aoe: w.aoe ?? 0, selfDmg: w.selfDmg ?? 0,
      }));
    }
    this.audio.play(id === 'shotgun' ? 'shotgun' : id === 'uzi' ? 'uzi' : id === 'sniper' ? 'sniper' : w.flame ? 'flame' : 'shoot');
    // the hybrid boss reacts to player gunfire
    if (!w.flame) {
      for (const e of this.enemies) {
        if (e.isBoss && e.onPlayerShot) e.onPlayerShot(this);
      }
    }
  }

  // ------------------------------------------------------------- frame update
  update(dt) {
    this.time += dt;
    const input = this.input;

    if (this.state === STATE.TITLE) {
      if (input.hit('Digit1')) { this.audio.ensure(); this.newRun(false); }
      if (input.hit('Digit2')) { this.audio.ensure(); this.newRun(true); }
      return;
    }
    if (this.state === STATE.GAMEOVER) {
      if (input.hit('KeyR')) this.newRun(this.impossible);
      if (input.hit('KeyM')) this.state = STATE.TITLE;
      return;
    }

    // ---- PLAYING ----
    if (this.pendingUpgrades) {
      const picks = this.pendingUpgrades;
      for (let i = 0; i < picks.length; i++) {
        if (input.hit('Digit' + (i + 1))) { this.applyUpgrade(picks[i]); break; }
      }
      this.ui.update(dt);
      return;   // world pauses during the choice
    }

    // hotbar select
    for (let i = 0; i < Math.min(9, this.hotbar.length); i++) {
      if (input.hit('Digit' + (i + 1))) this.hotbarIndex = i;
    }
    if (input.wheel) {
      this.hotbarIndex = (this.hotbarIndex + input.wheel + this.hotbar.length) % this.hotbar.length;
    }

    this.player.update(dt, this);
    this.useItem(dt);

    this.waves.update(dt);
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    this.enemies = this.enemies.filter(e => !e.dead);

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    // placed TNT fuses
    for (const t of this.placedTnt) {
      t.t -= dt;
      if (t.t <= 0) this.explode(t.x, t.y, WEAPONS.tnt.aoe, WEAPONS.tnt.dmg, WEAPONS.tnt.selfDmg);
    }
    this.placedTnt = this.placedTnt.filter(t => t.t > 0);

    this.world.update(dt, this);
    this.fx.update(dt);
    this.ui.update(dt);

    // camera follows player (integer coords to avoid tile seams)
    this.cam.x = Math.max(0, Math.min(this.world.w - this.cam.w, this.player.x - this.cam.w / 2));
    this.cam.y = Math.max(0, Math.min(this.world.h - this.cam.h, this.player.y - this.cam.h / 2));
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.cam.x += (Math.random() - 0.5) * this.shakeMag;
      this.cam.y += (Math.random() - 0.5) * this.shakeMag;
      if (this.shakeT <= 0) this.shakeMag = 0;
    }
    this.cam.x = Math.round(this.cam.x);
    this.cam.y = Math.round(this.cam.y);
  }

  // ------------------------------------------------------------- draw
  draw() {
    const { ctx, S } = this;
    ctx.imageSmoothingEnabled = false;

    if (this.state === STATE.TITLE) {
      this.ui.drawTitle(ctx, S, Math.floor(this.time * 1.4) % 2 === 0);
      return;
    }
    if (this.state === STATE.GAMEOVER) {
      this.ui.drawGameOver(ctx, S, { score: this.score, wave: this.waves.wave, best: this.best });
      return;
    }

    this.world.draw(ctx, S, this.cam);

    // placed TNT (blinking)
    for (const t of this.placedTnt) {
      const blink = Math.floor(t.t * 8) % 2 === 0;
      if (blink) ctx.filter = 'brightness(1.8)';
      ctx.drawImage(S.tnt, t.x - this.cam.x - 12, t.y - this.cam.y - 12, 24, 24);
      ctx.filter = 'none';
    }

    // entities sorted by y for a bit of depth
    const drawables = [...this.enemies];
    drawables.sort((a, b) => a.y - b.y);
    let playerDrawn = false;
    for (const e of drawables) {
      if (!playerDrawn && this.player.y < e.y) {
        this.player.draw(ctx, this.cam, S, this);
        playerDrawn = true;
      }
      e.draw(ctx, this.cam, S, this);
    }
    if (!playerDrawn) this.player.draw(ctx, this.cam, S, this);

    for (const pr of this.projectiles) pr.draw(ctx, this.cam, S);
    this.fx.draw(ctx, this.cam);

    // impossible mode: subtle red vignette
    if (this.impossible) {
      const grad = ctx.createRadialGradient(
        this.cam.w / 2, this.cam.h / 2, this.cam.h * 0.55,
        this.cam.w / 2, this.cam.h / 2, this.cam.h * 0.85);
      grad.addColorStop(0, 'rgba(180,40,30,0)');
      grad.addColorStop(1, 'rgba(180,40,30,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.cam.w, this.cam.h);
    }

    this.ui.drawHUD(ctx, S);
  }
}

function spriteKeyFor(id) {
  return {
    axe: 'axe', pickaxe: 'pickaxe', pistol: 'pistol', shotgun: 'shotgun',
    uzi: 'uzi', sniper: 'sniper', flamethrower: 'flamethrower', sword: 'sword',
    rocket: 'rocketL', tnt: 'tnt',
  }[id];
}
