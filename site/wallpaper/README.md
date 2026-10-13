# Ultima Warriors animated wallpaper

A live space battle for your desktop, made for a **5120 × 1440** super-ultrawide (it fills any
screen size). The Ultima Warriors fleet (carrier and frigate) fights the Void Legion
(dreadnought and cruiser) with fighters, shields, beam lances, missiles and torpedoes. Three
Ultima Warriors mechs fight alongside them, and the enemy cruiser gets blown apart every minute
or so before a new one jumps in.

**The mechs move like machines, not flat pictures.** Each one has a skeleton (hips, chest, head,
arms, legs) and the artwork bends at the joints:

- the gun arm turns to aim at its target, shots leave along the barrel, and each shot kicks the
  arm up and rocks the chest
- the head looks toward what it's shooting and glances around in between
- legs and the free arm swing loosely and lag behind when the mech boosts or dodges
- flight is springy, with sudden dodges, leaning into turns, and thrusters that flare when it
  accelerates

## Put it on your desktop (Windows)

**Lively Wallpaper (free, Microsoft Store):**
1. Install Lively Wallpaper.
2. Click **+ (Add wallpaper)** and either paste `https://ultimawarriors.netlify.app/wallpaper/`
   or choose this folder's `index.html` (download the `site/wallpaper` folder first).
3. Set it as your wallpaper.

**Wallpaper Engine (Steam):**
1. Download this `site/wallpaper` folder.
2. Wallpaper Engine → **Create Wallpaper** → open this folder's `index.html`.
   `project.json` is already filled in, including two settings: show/hide the title and kill
   counter, and low quality mode.

## Options

Add these to the end of the address (e.g. `index.html?fps=30&hud=0`):

| Option | What it does |
| --- | --- |
| `?fps=30` | Limit the frame rate (saves power; default matches your screen) |
| `?quality=low` | Fewer ships and particles, for slower computers |
| `?hud=0` | Hide the "Ultima Warriors" title and kill counter |

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `wallpaper.js` | The battle: ships, fighters, weapons, explosions, backdrop, title |
| `mech-rig.js` | The mech skeletons and how they move |
| `assets/` | Copies of the site's planet, space and mech artwork |
| `project.json` / `LivelyInfo.json` | Settings for Wallpaper Engine / Lively |
