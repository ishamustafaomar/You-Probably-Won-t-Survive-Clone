# You Probably Won't Survive — Clone Design Spec

A faithful clone of *You Probably Won't Survive* by BadGameDev — a top-down zombie
wave-survival game originally created in 48 hours for **Miz Jam 1** (itch.io), whose rule
was that all visuals must come from **Kenney's 1-Bit Pack** (CC0). This clone uses that
exact same asset pack (`assets/tilesheet.png`, `colored_transparent_packed.png`, 16×16
tiles). This spec is distilled from BadGameDev's dev-log video
(https://youtu.be/gblQcczWn1c) and the game's itch.io page.

## Core loop

- You spawn on a grassy island surrounded by water.
- Between waves (prep time), gather resources:
  - **Chop trees** with the axe → wood (+ saplings). Saplings can be replanted and grow
    back into trees.
  - **Mine stones** with the pickaxe → cobblestone.
- **Build** walls/blocks out of wood and cobblestone to form a base.
- Waves of zombies and monsters attack. Survive.
- **Endless mode**: the remake removed the "win at wave 7" rule — waves scale forever and
  the goal is a high **score** earned by killing enemies.

## Controls (as on the itch.io page)

- `WASD` — move
- `1–9` — hotbar slot select (mouse wheel also works)
- Mouse — aim
- Left click — use tool / attack / shoot
- Right click — build / plant sapling / place TNT

## Difficulty modes

- **Normal** — standard HP, enemies spawn at the island edges.
- **Impossible** — two changes: (1) any enemy hit kills you instantly; (2) enemies can
  spawn **anywhere** on the map, including inside your base.

## Enemies

| Enemy | Behavior |
|---|---|
| Zombie | Baseline chaser. Attacks player and breaks player-placed blocks slowly. |
| Skeleton | Slightly faster, slightly more damage and HP than zombie. |
| Mini Zombie | Much faster, less damage, less HP. |
| Big Zombie | Much slower, much more damage and HP. |
| Ghost | Two states: (1) chases like a normal enemy; (2) phases through walls and is invulnerable while phased. |
| Lava Monster | Approaches, then stops at range and shoots lava blasts that pass through/destroy wood and trees and deal heavy damage. |
| Slime | Deals no contact damage; shoots projectiles that **slow** the player so other enemies catch up. |
| Fake/Enemy Tree | Each tree that spawns has a 10% chance to be a fake tree (25% from saplings in an earlier version). Looks like a normal tree; when the player chops it, it falls on them and deals damage. |
| Armored Zombie | Like a big zombie with armor: **immune to bullets**. Only melee (axe/pickaxe/sword) hurts it. |

## Bosses

- **Big Zombie Boss** (first appears at wave 10): roams the map destroying any obstacle it
  collides with; at set intervals it stops, telegraphs, then **dashes** at the player.
  Contact knocks the player back and deals heavy damage. Spawns regular zombies before
  each dash.
- **Hybrid Zombie Boss** (two states):
  - *Player state*: fights like a player — shoots a gun at range, swings an axe up close,
    has a 25% chance to place a wooden block whenever the player fires a bullet (blocking
    shots), and chops obstacles (trees, player blocks, own blocks) with its axe.
  - *Zombie state*: behaves like a normal zombie — no items, breaks blocks slowly.
  - Alternates states on a timer.

## Tools & weapons

| Item | Behavior |
|---|---|
| Axe | Melee. Chops trees for wood. Works on armored zombies. |
| Pickaxe | Melee. Mines stone for cobblestone. Works on armored zombies. |
| Pistol | Baseline gun. |
| Shotgun | Fires 3 bullets in a spread. |
| Uzi | Pistol-like but much faster fire rate. |
| Sniper | Slow, powerful; a **headshot** (precise hit) kills a normal enemy instantly. |
| Flamethrower | Continuous stream of short-range flames. |
| Sword | Unlockable melee weapon, stronger than tools. |
| Rocket Launcher | Rockets explode on impact; the explosion damages enemies, obstacles **and the player**. |
| TNT | Placeable; explodes after a fuse, damaging everything around it. |

## Wave / upgrade systems (from the later "Fiverr" remake)

- New wave system: prep phase countdown between waves; wave size and enemy variety scale
  with wave number; bosses appear at milestone waves.
- Weapon **upgrade system**: kills earn score/currency used between waves to unlock
  weapons (shotgun → uzi → sniper → flamethrower → sword → rocket launcher → TNT) and to
  upgrade damage / fire rate.

## Building

- Place wood blocks / cobblestone blocks on the grid (cobblestone has more HP than wood).
- Enemies attack blocks in their way (slowly); Big Zombie Boss destroys blocks on contact;
  lava blasts destroy wood; rockets/TNT destroy blocks in radius.
- Plant saplings on grass; a sapling grows into a tree after a delay (with a chance the
  new tree is a Fake Tree — see enemies).

## Presentation

- 16×16 sprites from Kenney 1-Bit Pack, scaled up with nearest-neighbor (crisp pixels).
- HUD: hearts (HP), score, wave number, wave/prep timer, hotbar with item icons, resource
  counts (wood / stone), boss HP bar when a boss is alive.
- Menus: title screen (Play / Impossible Mode), death screen ("You didn't survive." +
  score + waves survived + restart), win-free endless flow.
- Screen shake + particles for explosions, hit flashes, muzzle flashes.

## Credit

- Art: Kenney 1-Bit Pack v1.1, CC0 — https://kenney.nl (see `assets/KENNEY-LICENSE.txt`).
- Original game concept: BadGameDev — https://badgamedevyt.itch.io/you-probably-wont-survive
  (this repo is a fan-made clone of the mechanics; the commissioned logo/concept art from
  the original are **not** copied).
