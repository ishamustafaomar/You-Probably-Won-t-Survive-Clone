// Sprite loading + recolouring for the Kenney 1-Bit Pack tilesheet.
// The pack's sprites are single-colour (cream) shapes; the original game tints
// them (green zombies, red lava monster, ...) — Miz Jam explicitly allowed
// tinting. We recolour per-pixel, optionally in vertical zones so a zombie can
// get red hair / green body / blue pants like in the video.

import { T, TILE_SRC, PALETTE } from './constants.js';

let sheet = null;
const cache = new Map();

export function loadSheet() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { sheet = img; resolve(img); };
    img.onerror = reject;
    img.src = 'assets/tilesheet.png';
  });
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// zones: array of { untilY (exclusive, 0-16), color } applied top-down.
// color=null keeps original pixels.
export function sprite(tileKey, opts = {}) {
  const key = JSON.stringify([tileKey, opts.color || null, opts.zones || null]);
  if (cache.has(key)) return cache.get(key);

  const [c, r] = T[tileKey];
  const cv = document.createElement('canvas');
  cv.width = TILE_SRC; cv.height = TILE_SRC;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sheet, c * TILE_SRC, r * TILE_SRC, TILE_SRC, TILE_SRC, 0, 0, TILE_SRC, TILE_SRC);

  if (opts.color || opts.zones) {
    const id = ctx.getImageData(0, 0, TILE_SRC, TILE_SRC);
    const d = id.data;
    for (let y = 0; y < TILE_SRC; y++) {
      let col = opts.color ? hexToRgb(opts.color) : null;
      if (opts.zones) {
        for (const z of opts.zones) {
          if (y < z.untilY) { col = z.color ? hexToRgb(z.color) : null; break; }
        }
      }
      if (!col) continue;
      for (let x = 0; x < TILE_SRC; x++) {
        const i = (y * TILE_SRC + x) * 4;
        if (d[i + 3] > 10) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
      }
    }
    ctx.putImageData(id, 0, 0);
  }
  cache.set(key, cv);
  return cv;
}

// Pre-baked sprite variants used by entities.
export function makeSprites() {
  const zombieZones = [
    { untilY: 5, color: PALETTE.zombieHair },
    { untilY: 11, color: PALETTE.zombieBody },
    { untilY: 16, color: PALETTE.zombiePants },
  ];
  return {
    player:      sprite('PLAYER', { color: '#ffffff' }),
    zombie:      sprite('HUMANOID', { zones: zombieZones }),
    skeleton:    sprite('SKELETON'),
    ghost:       sprite('GHOST', { color: PALETTE.ghost }),
    lava:        sprite('IMP', { color: PALETTE.lava }),
    slime:       sprite('SLIME'),
    armored:     sprite('ARMORED', { color: PALETTE.armored }),
    hybridP:     sprite('HUMANOID', { zones: [
      { untilY: 5, color: PALETTE.hybrid },
      { untilY: 11, color: PALETTE.zombieBody },
      { untilY: 16, color: PALETTE.hybrid },
    ] }),
    tree:        sprite('TREE'),
    treeSmall:   sprite('TREE_SMALL'),
    sapling:     sprite('SAPLING'),
    rocks:       sprite('ROCKS', { color: '#9aa0a8' }),
    trunk:       sprite('TRUNK'),
    wallWood:    sprite('WALL_WOOD'),
    wallStone:   sprite('WALL_STONE', { color: '#8d93a1' }),
    water:       sprite('WATER'),
    grassA:      sprite('GRASS_A', { color: '#c9c084' }),
    grassB:      sprite('GRASS_B', { color: '#c9c084' }),
    grassC:      sprite('GRASS_C', { color: '#d3ca90' }),
    flame:       sprite('FLAME'),
    flameBig:    sprite('FLAME_BIG'),
    heartFull:   sprite('HEART_FULL'),
    heartEmpty:  sprite('HEART_EMPTY', { color: '#5a4040' }),
    heartHalf:   sprite('HEART_HALF'),
    coin:        sprite('COIN'),
    crown:       sprite('CROWN'),
    axe:         sprite('AXE'),
    pickaxe:     sprite('PICKAXE'),
    sword:       sprite('SWORD'),
    pistol:      sprite('PISTOL'),
    shotgun:     sprite('SHOTGUN'),
    uzi:         sprite('UZI'),
    sniper:      sprite('SNIPER'),
    flamethrower: sprite('FLAMETHROWER'),
    rocketL:     sprite('ROCKET_L'),
    bomb:        sprite('BOMB'),
    tnt:         sprite('TNT'),
  };
}

export function tileByName(name) { return sprite(name); }
