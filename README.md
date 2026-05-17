# 🐤 Flappy Face

A gamified Flappy Bird clone in the browser where you can upload your own
photo as the bird, build custom levels, and unlock eight different
characters through achievements. No build step — vanilla HTML/CSS/JS that
runs on any modern browser.

```
       _    _
      ( \__/ )
       \ ◉◉ /
        \  /__
         \____)
   tap. flap. don't die.
```

## ✨ Features

- **Your photos everywhere** — upload images for the bird, the pipes, and the background straight from your phone (gallery or camera).
- **8 unlockable birds** — Buddy, Punk, Chill, Royal, Ghost, Rainbow, Pizza, and Legend, each with their own wing colors and gradients.
- **Achievement system with progress bars** — every locked bird shows exactly how close you are to unlocking it.
- **Combo system** — warm color shifts and fanfare popups when you string together a streak.
- **Random scenes** — every run picks one of three themes: day, dusk, or night (with moon, twinkling stars, and city silhouettes).
- **Level editor** — drag-and-drop to build your own maps, save them locally, export/import as JSON.
- **Stats card on the lobby** — best score, longest streak, total runs and crashes.
- **Animated lobby** — drifting clouds, a hero bird that flaps in place, title letters that bounce in, rotating tips.
- **Snappy juice** — spring-based animations, particle system, screen shake, Web Audio synth sounds, zero external audio files.
- **Mobile-first** — works on phone with touch controls and camera uploads.
- **No backend** — everything is stored in `localStorage` on the device.

## 🛠 Tech stack

- **Vanilla JavaScript** (ES modules) — no build step, no npm packages to install
- **HTML5 Canvas 2D** for all rendering
- **CSS3** with blocky game fonts and chunky shadow styling
- **Web Audio API** for procedurally generated sound effects
- **localStorage** for photos, levels, achievements, and stats
- **anime.js** (loaded via esm.sh CDN) for lobby animations
- **Google Fonts**: Bungee, Press Start 2P, Jersey 25

## 📁 Project structure

```
test/
├── index.html              # Markup for every screen (menu / play / editor / aviary)
├── style.css               # All styling
├── README.md               # This file
└── js/
    ├── main.js             # Entry point, screen routing, lobby + UI wiring
    ├── game.js             # Game loop, physics, collision, scoring
    ├── editor.js           # Level editor
    ├── scene.js            # Background themes (day/dusk/night) + parallax
    ├── birds.js            # 8 preset birds + wing rendering
    ├── achievements.js     # Unlocks + stats tracking
    ├── effects.js          # AudioBus, ScreenShake, ParticleSystem
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
6. Build a streak for **x5 COMBO!** bonuses and warmer background tints.
7. Crash = X-eyes, shatter, game-over overlay. Hit **Run it back** for another go.

## 🐦 Aviary (the bird collection)

Click **Aviary** from the menu to see all eight birds.

| Bird     | How to unlock                    |
|----------|----------------------------------|
| Buddy    | Default — always yours           |
| Punk     | Score **5** in a single run      |
| Chill    | Score **15**                     |
| Royal    | Score **30**                     |
| Ghost    | Crash **20 times** total         |
| Rainbow  | Score **50**                     |
| Pizza    | Easter egg — find it 🕵️          |
| Legend   | Score **100**                    |

Locked birds show your exact progress (e.g. `12/30`) with an animated
gradient bar. Tap any unlocked bird to equip it — your next run and the
menu's hero bird swap to it immediately.

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

## 📊 Stats & achievements

Everything is auto-saved to `localStorage`:

- `ff.stats` — all counters (games played, deaths, best run score, best combo, title clicks)
- `ff.unlocked` — array of IDs for your unlocked birds
- `ff.selectedBird` — your current avatar
- `ff.highscore` — highest score ever
- `ff.photos` — uploaded images (as data URLs)
- `ff.levels` — your saved levels

To reset everything: open DevTools (F12) → Application → Local Storage →
delete the `ff.*` keys. Or use the `Wipe Photos` button for photos only.

## 🎭 Themes

Each run randomly picks one of:
- **DAY** — blue sky, white clouds, glowing sun
- **DUSK** — purple/coral gradient, a setting sun, a few stars peeking through
- **NIGHT** — deep midnight blue, a moon with craters, **70 twinkling stars**, lit windows in the city skyline

If you upload your own background image, it replaces the themes.

## 🐣 Easter egg

There's a secret bird. Its name is Pizza. Good luck! 🍕

(Hint: pay attention to how the Aviary shows progress — it's already
counting something that lives on the front page of the game.)

## 🏗 Architecture

The game is split into focused modules:

- **`game.js`** — Main loop, state machine (`countdown` → `playing` → `dying` → `over`), collision, scoring, combos
- **`scene.js`** — Everything non-gameplay: sky, clouds, moon, sun, stars, city silhouettes, hot air balloons, ground, grass
- **`birds.js`** — 8 procedurally drawn preset birds + shared helpers (`shadedBody`, `standardEye`, `beak`, `cheek`, `drawWing`)
- **`achievements.js`** — Stats recorders + an unlock-listener pattern
- **`effects.js`** — `AudioBus` (Web Audio synth), `ScreenShake` (exponential decay), `ParticleSystem` (confetti + fragments), `springStep` (physics for squash animations)
- **`editor.js`** — Level editor canvas + JSON export/import

Render order in `game.js`:
1. `drawScene` (sky → stars → moon/sun → city → balloons → clouds)
2. Pipes
3. `drawGround` (ground + grass)
4. Speed lines (when falling fast)
5. Bird (with wing + X-eyes when dying)
6. Particles
7. Countdown / GO! text
8. Popups (milestones + "+1")
9. Combo tint + death-flash overlay

## 🤝 Contributing / extending

There's no build step, so just edit the files and hard-refresh
(`Ctrl+Shift+R`).

Ideas that aren't implemented yet:
- Daily challenge mode with a rotating modifier (inverted gravity, darkness, etc.)
- Trails behind the bird (separate cosmetic unlock)
- More birds (15 total?)
- Achievement panel showing all stats
- Multiplayer ghost-replay

## 📜 License

Do whatever you want with it. Your photos are your own — the game only
stores them locally on your device and never sends them anywhere.

---

Happy flapping! 🐤
