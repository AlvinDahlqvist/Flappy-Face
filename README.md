# 🐤 Flappy Face

A gamified Flappy Bird clone in the browser where you can upload your own
photo as the bird, build custom levels, collect coins, score near-misses,
and unlock ten different characters through achievements. No build step —
vanilla HTML/CSS/JS that runs on any modern browser.

```
       _    _
      ( \__/ )
       \ ◉◉ /
        \  /__
         \____)
   tap. flap. don't die.
```

## ✨ Features

- **Your photos everywhere** — upload images for the bird, the pipes, and the background (gallery or camera).
- **10 unlockable birds** — Buddy, Punk, Chill, Royal, Ghost, Rainbow, Pizza, Daredevil, Collector, Legend.
- **Coins with magnet** — gold ★ coins drift in the gaps between pipes; once you get close, they curve toward you and pop in a ring burst (+5 each).
- **Near-miss bonuses** — scrape past a pipe edge for a green "CLOSE!" popup, a whoosh sound, screen shake and +2 bonus points.
- **Combo / streak system** — chain pipes for big "x5 COMBO!" popups, screen-tint hot zones, and scaling shake intensity.
- **Achievement system with progress bars** — every locked bird shows exactly how far you've gotten on its unlock condition.
- **End-of-run summary** — game-over screen shows Coins, Closes, Streak, Flaps and Time for the run, each number tweening up.
- **Animated lobby + aviary** — hero bird flaps on the menu, every aviary tile bobs and flaps with phase-offset timing.
- **Random themed scenes** — every run picks day, dusk, or night, with full palette swaps, sun/moon, drifting clouds, hot-air balloons, lit city windows at night.
- **Bird trail** — ghost afterimage that grows with your combo for satisfying movement feedback.
- **Bird shadow** — soft elliptical shadow on the ground that scales with height.
- **Level editor** — drag-and-drop to build maps, save locally, export/import as JSON.
- **Stats card on the lobby** — best score, longest streak, total runs and crashes.
- **Snappy juice** — spring-based animations, particle system, screen shake, Web Audio synth sounds, zero external audio files.
- **Mobile-first** — works on phone with touch controls and camera uploads.
- **No backend** — everything is stored in `localStorage` on the device.

## 🛠 Tech stack

- **Vanilla JavaScript** (ES modules) — no build step, no npm packages to install
- **HTML5 Canvas 2D** for all rendering
- **CSS3** with blocky game fonts and chunky shadow styling
- **Web Audio API** for procedurally generated sound effects
- **localStorage** for photos, levels, achievements, and stats
- **anime.js** (loaded via esm.sh CDN) for lobby + summary animations
- **Google Fonts**: Bungee, Press Start 2P, Jersey 25

## 📁 Project structure

```
test/
├── index.html              # Markup for every screen (menu / play / editor / aviary)
├── style.css               # All styling
├── README.md               # This file
└── js/
    ├── main.js             # Entry point, screen routing, lobby + UI wiring
    ├── game.js             # Game loop, physics, collision, scoring, coins, near-miss
    ├── editor.js           # Level editor
    ├── scene.js            # Background themes (day/dusk/night) + parallax depth
    ├── birds.js            # 10 preset birds + wing rendering + shared draw helpers
    ├── achievements.js     # Unlocks + stats tracking + progress getters
    ├── effects.js          # AudioBus, ScreenShake, ParticleSystem, ring burst, spring
    ├── assets.js           # Photo upload + image cache
    ├── storage.js          # localStorage wrappers
    └── input.js            # Key/touch/pointer handlers
```

## 🚀 Getting started

### 1. Clone / download the repo

```powershell
git clone <repo-url>
cd flappy-face/test
```

(Or just copy the `test/` folder anywhere you like.)

### 2. Start a local web server

You **must** run this via an HTTP server because the game uses ES modules,
which don't work via `file://` in most browsers. Pick any of the following:

**Python** (preinstalled on Windows):
```powershell
py -m http.server 8765
```

**Node.js**:
```bash
npx serve -l 8765 .
```

**PHP**:
```bash
php -S localhost:8765
```

### 3. Open the game

Open [http://localhost:8765/](http://localhost:8765/) in your browser.
Hard-refresh with `Ctrl+Shift+R` if something doesn't update.

### 4. Play on your phone (same WiFi)

1. Find your computer's IP: `ipconfig` → look for **IPv4 Address** (e.g. `192.168.0.24`)
2. Open on your phone: `http://<your-ip>:8765/`
3. If it doesn't connect, the Windows firewall is probably blocking the port — run this in an **Administrator** PowerShell:
   ```powershell
   New-NetFirewallRule -DisplayName "Flappy Face dev" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow
   ```

## 🎮 How to play

### Controls

| Action       | Key / Button           |
|--------------|------------------------|
| Flap         | `Space`, `↑`, `W`, **click**, or **tap** |
| Pause        | Pause button in HUD    |
| Mute / unmute| `M` button in HUD      |
| Quit         | `X` button in HUD      |

### Flow

1. **Upload photos** (optional) on the menu — your face, your own obstacles, a background.
2. Hit **SEND IT** for a randomly generated run.
3. A **3-2-1-GO!** countdown plays, then the bird starts falling.
4. Tap to flap up. Avoid the pipes. Don't hit the ground.
5. Every pipe you clear gives **+1 point** and a gold "+1" popup.
6. **Grab gold coins** floating between pipes for **+5 each** — they magnet toward you once you're close.
7. **Scrape past pipe edges** for "CLOSE!" near-miss bonuses (+2).
8. Build a **streak** for "x5 COMBO!" bonuses, screen tints, and shake that scales with your combo.
9. Crash = X-eyes, dramatic spin, shatter, red flash, then the **end-of-run summary card** slides up with all your stats.
10. Hit **Run it back** for another go.

## 🐦 Aviary (the bird collection)

Click **Aviary** from the menu to see all ten birds. Each tile is alive — every bird
idle-bobs and flaps its wing on its own card with offset timing, and your currently
equipped bird gets a pulsing golden glow.

| Bird       | How to unlock                       |
|------------|-------------------------------------|
| Buddy      | Default — always yours              |
| Punk       | Score **5** in a single run         |
| Chill      | Score **15**                        |
| Royal      | Score **30**                        |
| Ghost      | Crash **20 times** total            |
| Rainbow    | Score **50**                        |
| Pizza      | Easter egg — find it 🕵️             |
| Daredevil  | **10 near-misses** in a single run  |
| Collector  | Collect **100 coins** total         |
| Legend     | Score **100**                       |

Locked birds show your exact progress (e.g. `12/30`) with an animated gradient
bar. Tap any unlocked bird to equip it — your next run and the menu's hero
bird swap to it immediately.

### Photo bird

If you upload an image on the menu, a **"YOUR FACE"** tile appears at the
top of the Aviary. It's always selectable (as long as the photo is still
saved).

## 🎨 Level editor

1. Hit **Build a Map** on the menu.
2. Use the tools in the top toolbar:
   - **+** — tap to place a pipe pair
   - **M** — drag to move a pipe (or pan-scroll)
   - **−** — tap to delete a pipe
3. The slider in the bottom toolbar adjusts the **gap size** for every pipe.
4. **Test** — plays your level immediately.
5. **Save** — stores it locally under a chosen name (shows up in "My Maps").
6. **Export** — downloads the level as `.json` (photos are embedded so friends can play it with your look).
7. **Import** — load a `.json` from a friend.

Custom levels also spawn coins between pipes, so they reward exploration
just like random mode.

## 📊 Stats & achievements

Everything is auto-saved to `localStorage`:

- `ff.stats` — all counters (games played, deaths, best run score, best combo, total coins, max near-misses in a run, title clicks, custom completes)
- `ff.unlocked` — array of IDs for your unlocked birds
- `ff.selectedBird` — your current avatar
- `ff.highscore` — highest score ever
- `ff.photos` — uploaded images (as data URLs)
- `ff.levels` — your saved levels
- `ff.muted` — sound preference

To reset everything: open DevTools (F12) → Application → Local Storage →
delete the `ff.*` keys. Or use the `Wipe Photos` button for photos only.

## 🎭 Themes

Each run randomly picks one of:
- **DAY** — blue sky, white clouds, glowing sun with rays
- **DUSK** — purple/coral gradient, a setting sun, a few stars peeking through
- **NIGHT** — deep midnight blue, a moon with craters, **70 twinkling stars**, lit windows in the city skyline

All themes have parallax city silhouettes and drifting hot-air balloons that
move at different scroll speeds for proper depth. If you upload your own
background image, it replaces the themes entirely.

## 🐣 Easter egg

There's a secret bird. Its name is Pizza. Good luck! 🍕

(Hint: pay attention to how the Aviary shows progress — it's already
counting something that lives on the front page of the game.)

## 🏗 Architecture

The game is split into focused modules:

- **`game.js`** — Main loop, state machine (`countdown` → `playing` → `dying` → `over`), collision, scoring, combos, coin spawning + magnet + pickup, near-miss detection, bird trail, shadow, end-of-run stat tracking
- **`scene.js`** — Everything non-gameplay: sky gradient, clouds, moon, sun, twinkling stars, parallax city silhouettes, hot air balloons, ground, grass tufts
- **`birds.js`** — 10 procedurally drawn preset birds + shared helpers (`shadedBody`, `standardEye`, `beak`, `cheek`, `drawWing`)
- **`achievements.js`** — Stats recorders, unlock-listener pattern, `getProgress` for progress bars
- **`effects.js`** — `AudioBus` (Web Audio synth), `ScreenShake` (exponential decay), `ParticleSystem` (confetti + fragments), `spawnRingBurst` (coin pickup ring), `springStep` (physics for squash animations)
- **`editor.js`** — Level editor canvas + JSON export/import

Render order in `game.js`:
1. `drawScene` (sky → stars → moon/sun → city → balloons → clouds)
2. Pipes
3. Coins (with halo + spin animation)
4. `drawGround` (ground + grass)
5. Bird shadow (under bird, scales with height)
6. Speed lines (when falling fast)
7. Bird trail (ghost copies, scales with combo)
8. Bird (with wing + X-eyes when dying)
9. Particles
10. Countdown / GO! text
11. Combo tint + death-flash overlay
12. Popups (milestones, "+1", "+5", "CLOSE!", "x5 COMBO!")

## 🤝 Contributing / extending

There's no build step, so just edit the files and hard-refresh
(`Ctrl+Shift+R`).

Ideas that aren't implemented yet:
- **Power-ups** — Shield (one free hit), slow-mo, shrink, magnet boost
- **Daily challenge** — daily seeded modifier (inverted gravity, fog, no coins) with streak tracking
- **Settings page** — volume slider, control prefs, reset stats button
- **More birds** — push to 15+ with new unlock types
- **Bird trails as cosmetic unlocks** — rainbow trail, fire trail, etc.
- **Achievement panel** — dedicated screen showing every stat
- **Pipe movement variants** — oscillating pipes after score 20 for difficulty progression
- **Share-image** — generate a PNG of your best run for socials

## 📜 License

Do whatever you want with it. Your photos are your own — the game only
stores them locally on your device and never sends them anywhere.

---

Happy flapping! 🐤
