# You Probably Won't Survive — Clone

A fan-made, browser-playable clone of **[You Probably Won't Survive](https://badgamedevyt.itch.io/you-probably-wont-survive)**
by [BadGameDev](https://www.youtube.com/@BadGameDev), the top-down zombie island
survival game originally built in 48 hours for **Miz Jam 1** and then expanded over a
year of dev-log updates ([video](https://youtu.be/gblQcczWn1c)).

It uses the **exact same asset pack** as the original: the jam's rule was that all
visuals must come from [Kenney's 1-Bit Pack](https://kenney.nl/assets/1-bit-pack)
(CC0 / public domain), which is bundled unmodified at `assets/tilesheet.png`.
Zero dependencies — plain HTML5 canvas + ES modules.

## Play

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static file server works; ES modules won't load from `file://`.)

## Controls

| Input | Action |
|---|---|
| `WASD` / arrows | Move |
| Mouse | Aim |
| Left click | Use tool / shoot / melee |
| Right click | Place wall / plant sapling / place TNT |
| `1`–`9`, mouse wheel | Hotbar select |

## The game

- Chop **trees** for wood (and saplings), mine **rocks** for stone, and build walls
  before each wave hits.
- **Endless waves** — kill enemies for score and XP; level up to pick upgrades; new
  weapons unlock at wave milestones (shotgun, uzi, sniper, flamethrower, sword,
  rocket launcher, TNT).
- **9 enemy types**: zombie, skeleton, mini zombie, big zombie, ghost (phases through
  walls), lava monster (blasts burn through wood), slime (slowing shots), fake trees,
  and the bullet-immune armored zombie (melee only!).
- **2 bosses**: the dashing Big Zombie Boss (wave 10) and the Hybrid Zombie (wave 20),
  which fights like a player — shooting, chopping, and placing blocks to stop your
  bullets — then reverts to a mindless zombie.
- **Impossible mode**: one hit kills you, and enemies spawn *anywhere* — including
  inside your base.

See [SPEC.md](SPEC.md) for the full design document distilled from the dev-log video.

## Credits

- **Original game & concept:** BadGameDev — go play
  [the real thing](https://badgamedevyt.itch.io/you-probably-wont-survive) and support
  him on [Patreon](https://www.patreon.com/badgamedev). This clone re-implements the
  mechanics for fun/education and copies none of his code, commissioned logo, or
  concept art.
- **Art:** [Kenney 1-Bit Pack v1.1](https://kenney.nl/assets/1-bit-pack), CC0 —
  see `assets/KENNEY-LICENSE.txt`. (Multi-color characters are produced by tinting the
  pack's sprites, the same technique the jam allowed.)
- **Audio:** synthesized at runtime with WebAudio; no audio assets.
