// Tile coordinates (col, row) into assets/tilesheet.png — Kenney 1-Bit Pack v1.1
// (colored_transparent_packed.png, 48x22 grid of 16x16 tiles, CC0).

export const TILE_SRC = 16;      // source tile size in the sheet
export const TILE = 32;          // on-screen tile size (2x nearest-neighbour)

export const SHEET_COLS = 48;
export const SHEET_ROWS = 22;

// ---- sprite catalogue -------------------------------------------------------
export const T = {
  PLAYER:        [25, 0],
  HUMANOID:      [25, 4],   // spiky-hair, arms-out figure: base shape for zombies
  SKELETON:      [29, 6],
  GHOST:         [26, 6],
  IMP:           [29, 7],   // horned monster: lava monster shape
  ARMORED:       [31, 6],   // bulky armored figure: armored zombie
  SLIME:         [20, 5],   // round green blob
  TREE:          [0, 1],    // pine tree
  TREE_SMALL:    [1, 1],
  SAPLING:       [2, 2],
  ROCKS:         [5, 2],    // rock cluster (mineable stone)
  TRUNK:         [18, 6],   // tree trunk (wood icon)
  WALL_WOOD:     [16, 0],   // woven crate texture — wood wall block
  WALL_STONE:    [22, 3],   // square-in-square block — cobblestone wall
  WATER:         [8, 5],
  GRASS_A:       [5, 0],
  GRASS_B:       [6, 0],
  GRASS_C:       [7, 0],
  SPECKLE_A:     [1, 0],
  SPECKLE_B:     [2, 0],
  FLAME_BIG:     [14, 10],
  FLAME:         [15, 10],
  AXE:           [41, 7],
  PICKAXE:       [43, 5],
  SWORD:         [36, 8],
  PISTOL:        [37, 9],
  SHOTGUN:       [39, 9],
  UZI:           [41, 9],
  SNIPER:        [42, 9],
  FLAMETHROWER:  [44, 9],
  ROCKET_L:      [43, 9],
  BOMB:          [45, 9],
  TNT:           [46, 9],
  HEART_FULL:    [39, 10],
  HEART_EMPTY:   [40, 10],
  HEART_HALF:    [41, 10],
  COIN:          [41, 3],
  CROWN:         [43, 2],
};

// ---- palette (sampled from the video frames / pack colours) -----------------
export const PALETTE = {
  ground:      '#efe9b8',
  groundDeco:  '#ded convert', // unused placeholder overwritten below
  water:       '#3e9ad2',
  night:       '#1a1c2c',
  cream:       '#e8e0c8',
  zombieBody:  '#57a04f',
  zombieHair:  '#c3452f',
  zombiePants: '#3f74b5',
  bigZombie:   '#3f8c3f',
  ghost:       '#f2efe4',
  lava:        '#c0392b',
  lavaBlast:   '#e67e22',
  armored:     '#8e9aa8',
  slime:       '#5fbf4f',
  hybrid:      '#2e7d5b',
  fakeTree:    '#3f9b3f',
  ui:          '#f4f1de',
  uiDim:       '#b9b4a0',
  xp:          '#e7c934',
  boss:        '#d84a3a',
};
PALETTE.groundDeco = '#ddd5a0';

// ---- gameplay config --------------------------------------------------------
export const WORLD = {
  COLS: 64, ROWS: 44,          // island map in tiles
  TREES: 230, ROCKS: 40,       // dense forest, like the updated version of the game
  FAKE_TREE_CHANCE: 0.10,      // world-grown trees
  FAKE_SAPLING_CHANCE: 0.25,   // trees grown from planted saplings
  SAPLING_GROW_TIME: 35,       // seconds
};

export const PLAYER_CFG = {
  speed: 155,
  maxHearts: 3,               // hearts (each = 2 half-hearts)
  hitInvuln: 0.8,
  reach: 52,                  // melee / interact reach in px
};

// damage is measured in hearts
export const ENEMIES = {
  zombie:   { hp: 3,  speed: 42,  dmg: 0.5, score: 10, tint: 'zombie',   scale: 1.0,  blockDps: 1.0 },
  skeleton: { hp: 4,  speed: 55,  dmg: 1.0, score: 15, tint: 'skeleton', scale: 1.0,  blockDps: 1.0 },
  mini:     { hp: 1,  speed: 95,  dmg: 0.25, score: 5,  tint: 'zombie',   scale: 0.7,  blockDps: 0.7 },
  big:      { hp: 10, speed: 26,  dmg: 1.5, score: 30, tint: 'zombie',   scale: 1.6,  blockDps: 2.0 },
  ghost:    { hp: 3,  speed: 48,  dmg: 0.5, score: 20, tint: 'ghost',    scale: 1.0,  blockDps: 0 },
  lava:     { hp: 5,  speed: 36,  dmg: 1.0, score: 25, tint: 'lava',     scale: 1.1,  blockDps: 0.5,
              range: 190, shotCd: 2.0, blastSpeed: 130, blastDmg: 1.5 },
  slime:    { hp: 4,  speed: 30,  dmg: 0,   score: 15, tint: 'slime',    scale: 1.0,  blockDps: 0,
              range: 230, shotCd: 2.5, slowDur: 2.5, slowFactor: 0.5 },
  armored:  { hp: 12, speed: 22,  dmg: 1.0, score: 40, tint: 'armored',  scale: 1.4,  blockDps: 1.2,
              bulletImmune: true },
};

export const BOSSES = {
  bigZombie: {
    hp: 60, hpPerWave: 4, speed: 32, scale: 2.6, dmg: 2, score: 250,
    roamTime: 3.5, telegraph: 0.9, dashSpeed: 340, dashTime: 0.55,
    knockback: 170, minionsPerDash: 3,
  },
  hybrid: {
    hp: 50, hpPerWave: 4, speed: 60, scale: 1.5, dmg: 1, score: 250,
    playerStateTime: 12, zombieStateTime: 8,
    shotCd: 1.0, shotDmg: 0.5, keepDistance: 190,
    axeDmg: 1, axeRange: 56, blockOnShotChance: 0.25,
  },
};

// weapon unlock wave milestones — "New Weapon" toasts like the video
export const WEAPONS = {
  axe:      { melee: true,  dmg: 1,   rof: 2.5, range: 52, tile: 'AXE',          name: 'Axe' },
  pickaxe:  { melee: true,  dmg: 1,   rof: 2.5, range: 52, tile: 'PICKAXE',      name: 'Pickaxe' },
  pistol:   { dmg: 1,   rof: 3.0, speed: 430, spread: 2,  tile: 'PISTOL',       name: 'Pistol' },
  shotgun:  { dmg: 1,   rof: 1.2, speed: 400, spread: 12, pellets: 3, tile: 'SHOTGUN', name: 'Shotgun', unlockWave: 3 },
  uzi:      { dmg: 0.7, rof: 9.0, speed: 430, spread: 5,  tile: 'UZI',          name: 'Uzi', unlockWave: 5 },
  sniper:   { dmg: 3,   rof: 0.8, speed: 720, spread: 0,  pierce: 2, headshot: true, tile: 'SNIPER', name: 'Sniper', unlockWave: 7 },
  flamethrower: { dmg: 0.28, rof: 16, speed: 210, spread: 9, range: 150, flame: true, tile: 'FLAMETHROWER', name: 'Flamethrower', unlockWave: 9 },
  sword:    { melee: true, dmg: 4, rof: 2.0, range: 62, arc: 1.6, tile: 'SWORD', name: 'Sword', unlockWave: 11 },
  rocket:   { dmg: 8, rof: 0.8, speed: 270, spread: 0, rocket: true, aoe: 72, selfDmg: 1.5, tile: 'ROCKET_L', name: 'Rocket Launcher', unlockWave: 13 },
  tnt:      { placeable: true, fuse: 2.0, aoe: 95, dmg: 10, selfDmg: 2, tile: 'TNT', name: 'TNT', unlockWave: 15 },
};

export const BUILD = {
  wood:  { cost: 2, res: 'wood',  hp: 8,  tile: 'WALL_WOOD',  name: 'Wood Wall' },
  stone: { cost: 2, res: 'stone', hp: 20, tile: 'WALL_STONE', name: 'Stone Wall' },
};

export const WAVES = {
  prepTime: 15,          // seconds between waves
  firstPrep: 10,
  budgetBase: 8,         // enemy budget = base + wave * perWave
  budgetPerWave: 4.5,    // updated-version pacing: hordes, not trickles
  bossEvery: 10,         // boss waves: 10, 20, 30... alternate big/hybrid
  // wave at which each enemy starts appearing, and its budget cost
  roster: {
    zombie:   { fromWave: 1, cost: 1 },
    skeleton: { fromWave: 2, cost: 1.5 },
    mini:     { fromWave: 3, cost: 0.7 },
    big:      { fromWave: 4, cost: 3 },
    ghost:    { fromWave: 5, cost: 2 },
    lava:     { fromWave: 6, cost: 2.5 },
    slime:    { fromWave: 7, cost: 1.5 },
    armored:  { fromWave: 8, cost: 3.5 },
  },
};

export const XP = {
  perScore: 1,             // xp == score gained
  levelBase: 60,           // xp to reach level 2
  levelGrowth: 1.35,
  // level-up choices
  upgrades: [
    { id: 'dmg',    name: '+15% Damage' },
    { id: 'rof',    name: '+12% Fire Rate' },
    { id: 'speed',  name: '+8% Move Speed' },
    { id: 'heart',  name: '+1 Max Heart' },
  ],
};
