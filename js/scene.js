// Themed scenes that give the game proper depth — sky, stars, moon, city
// silhouette, drifting hot-air balloons, layered clouds, ground.

export const THEMES = {
  day: {
    id: 'day',
    skyTop: '#4cb0d8', skyMid: '#9bdbef', skyBot: '#dff1f6',
    cloud: '#ffffff', cloudShadow: '#bcd6df', cloudOpacity: [0.55, 0.75, 0.92],
    cityFar: '#5d7493', cityNear: '#3e547a', cityAlpha: 0.45,
    light: '#ffd166', lightStroke: '#a8782e',
    lightKind: 'sun', stars: 0,
    balloonColors: ['#ef476f', '#06d6a0', '#ffd166', '#ec4899'],
    groundDirt: '#6b4226', groundDirtDark: '#4a2d1a',
    grassFront: '#88a06b', grassDark: '#5d7a4a',
  },
  dusk: {
    id: 'dusk',
    skyTop: '#3a3d6e', skyMid: '#d96a78', skyBot: '#ffba8c',
    cloud: '#ffc4b8', cloudShadow: '#a85a7e', cloudOpacity: [0.4, 0.65, 0.85],
    cityFar: '#43365f', cityNear: '#231b3a', cityAlpha: 0.7,
    light: '#ff7a5c', lightStroke: '#7a2418',
    lightKind: 'sun', stars: 25,
    balloonColors: ['#5d4d8a', '#8a4660', '#c97089'],
    groundDirt: '#4d2e1f', groundDirtDark: '#2d1810',
    grassFront: '#6a8556', grassDark: '#3d5230',
  },
  night: {
    id: 'night',
    skyTop: '#0e1530', skyMid: '#1f2752', skyBot: '#384675',
    cloud: '#9eb6d9', cloudShadow: '#46557a', cloudOpacity: [0.30, 0.50, 0.72],
    cityFar: '#0a1124', cityNear: '#040614', cityAlpha: 0.95,
    light: '#e8eef5', lightStroke: '#a8b3c4',
    lightKind: 'moon', stars: 70,
    balloonColors: ['#2d2a47', '#3e4768', '#5d4d8a'],
    groundDirt: '#3a2818', groundDirtDark: '#1e1409',
    grassFront: '#4a6244', grassDark: '#2d4030',
  },
};

const THEME_KEYS = Object.keys(THEMES);
export function pickTheme() {
  return THEMES[THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)]];
}

// ============ BUILD SCENE DATA ============

export function buildScene(theme, viewW, groundY) {
  return {
    theme,
    viewW, groundY,
    clouds: buildClouds(viewW, groundY),
    stars: buildStars(viewW, groundY, theme.stars),
    cityFar: buildCity(viewW, groundY, 0.42, 14, 0.35),
    cityNear: buildCity(viewW, groundY, 0.32, 22, 0.45),
    balloons: buildBalloons(viewW, groundY, theme.balloonColors),
    grass: buildGrassTufts(viewW),
  };
}

const CLOUD_LAYERS = [
  { speed: 0.10, opacity: 0, sizeMin: 28, sizeMax: 50, count: 4, yFrac: 0.08 },
  { speed: 0.25, opacity: 1, sizeMin: 45, sizeMax: 75, count: 5, yFrac: 0.20 },
  { speed: 0.45, opacity: 2, sizeMin: 60, sizeMax: 95, count: 4, yFrac: 0.32 },
];

function buildClouds(viewW, groundY) {
  const out = [];
  for (const layer of CLOUD_LAYERS) {
    for (let i = 0; i < layer.count; i++) {
      out.push({
        layer,
        x: Math.random() * (viewW + 200),
        y: layer.yFrac * groundY + (Math.random() - 0.5) * groundY * 0.05,
        size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
      });
    }
  }
  return out;
}

function buildStars(viewW, groundY, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * viewW,
      y: Math.random() * groundY * 0.55,
      size: 0.6 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 3,
    });
  }
  return stars;
}

function buildCity(viewW, groundY, baseYFrac, count, randHeight) {
  const buildings = [];
  let x = -40;
  while (x < viewW + 80) {
    const w = 28 + Math.random() * 50;
    const h = groundY * (baseYFrac + Math.random() * randHeight);
    buildings.push({ x, w, h, windows: Math.random() > 0.4 });
    x += w + 4 + Math.random() * 18;
  }
  return buildings;
}

function buildBalloons(viewW, groundY, colors) {
  const balloons = [];
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    balloons.push({
      x: Math.random() * (viewW * 1.5),
      y: groundY * (0.18 + Math.random() * 0.30),
      size: 18 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 8 + Math.random() * 10,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
  return balloons;
}

function buildGrassTufts(viewW) {
  const tufts = [];
  const spacing = 30;
  const total = Math.ceil(viewW / spacing) + 8;
  for (let i = 0; i < total; i++) {
    tufts.push({
      x: i * spacing + (Math.random() - 0.5) * 14,
      h: 6 + Math.random() * 9,
      sway: Math.random() * Math.PI * 2,
    });
  }
  return tufts;
}

// ============ DRAW SCENE ============

export function updateScene(scene, dt) {
  for (const b of scene.balloons) {
    b.x -= b.speed * dt;
    if (b.x < -60) b.x = scene.viewW + 60;
  }
}

export function drawScene(ctx, scene, scrollX, time, viewW, viewH, groundY) {
  const t = scene.theme;

  // 1. Sky gradient (3-stop)
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, t.skyTop);
  grad.addColorStop(0.65, t.skyMid);
  grad.addColorStop(1, t.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2. Stars (with twinkle)
  for (const s of scene.stars) {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * s.speed + s.twinkle));
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    if (s.size > 1.2) {
      // tiny cross sparkle for bigger stars
      ctx.fillRect(s.x - s.size * 2, s.y - 0.5, s.size * 4, 1);
      ctx.fillRect(s.x - 0.5, s.y - s.size * 2, 1, s.size * 4);
    }
  }

  // 3. Sun or Moon
  if (t.lightKind === 'moon') {
    drawMoon(ctx, viewW * 0.78, groundY * 0.22, 38, time, t);
  } else {
    drawSun(ctx, viewW * 0.83, groundY * 0.20, 36, time, t);
  }

  // 4. City silhouettes (far, then near)
  drawCity(ctx, scene.cityFar, scrollX, 0.15, groundY, t.cityFar, t.cityAlpha * 0.7, false);
  drawCity(ctx, scene.cityNear, scrollX, 0.30, groundY, t.cityNear, t.cityAlpha, t.lightKind === 'night' || t.lightKind === 'moon');

  // 5. Hot air balloons (mid-back)
  for (const b of scene.balloons) {
    const bobY = b.y + Math.sin(time * 1.2 + b.bobOffset) * 4;
    drawBalloon(ctx, b.x, bobY, b.size, b.color, t.lightKind === 'moon');
  }

  // 6. Cloud layers (closest to camera)
  for (const c of scene.clouds) {
    const cycleW = viewW + c.size * 3;
    let sx = c.x - scrollX * c.layer.speed;
    sx = ((sx % cycleW) + cycleW) % cycleW - c.size * 1.5;
    const baseAlpha = [0.4, 0.6, 0.78][c.layer.opacity] || 0.6;
    drawCloud(ctx, sx, c.y, c.size, baseAlpha, t.cloud, t.cloudShadow);
  }
}

export function drawGround(ctx, scene, scrollX, time, viewW, viewH, groundY) {
  const t = scene.theme;
  // dirt body with stripes
  ctx.fillStyle = t.groundDirt;
  ctx.fillRect(0, groundY, viewW, viewH - groundY);
  // dirt darker stripes (subtle horizontal lines)
  ctx.fillStyle = t.groundDirtDark;
  for (let y = groundY + 16; y < viewH; y += 18) {
    ctx.fillRect(0, y, viewW, 3);
  }
  // dirt detail dots (small darker rocks)
  const dotPhase = (scrollX * 0.85) % 60;
  for (let x = -dotPhase; x < viewW + 60; x += 60) {
    ctx.fillRect(x + 15, groundY + 22, 4, 3);
    ctx.fillRect(x + 40, groundY + 40, 3, 3);
  }
  // grass band on top
  ctx.fillStyle = t.grassFront;
  ctx.fillRect(0, groundY, viewW, 10);
  ctx.fillStyle = t.grassDark;
  ctx.fillRect(0, groundY + 8, viewW, 3);
  // grass tufts
  ctx.fillStyle = t.grassDark;
  const cycle = viewW + 80;
  for (const tuft of scene.grass) {
    const raw = (tuft.x - scrollX * 0.7) % cycle;
    const x = raw < 0 ? raw + cycle : raw;
    const sway = Math.sin(time * 1.5 + tuft.sway) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, groundY);
    ctx.lineTo(x + sway, groundY - tuft.h);
    ctx.lineTo(x + 5, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4, groundY);
    ctx.lineTo(x + 6 + sway * 0.7, groundY - tuft.h * 0.7);
    ctx.lineTo(x + 8, groundY);
    ctx.closePath();
    ctx.fill();
  }
}

// ============ LIGHT SOURCES ============

function drawSun(ctx, x, y, r, t, theme) {
  const pulse = 1 + Math.sin(t * 1.2) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  // halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * pulse * 2.4);
  halo.addColorStop(0, hexToRgba(theme.light, 0.5));
  halo.addColorStop(1, hexToRgba(theme.light, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse * 2.4, 0, Math.PI * 2);
  ctx.fill();
  // rays
  ctx.strokeStyle = hexToRgba(theme.light, 0.5);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + t * 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * pulse * 1.2, Math.sin(a) * r * pulse * 1.2);
    ctx.lineTo(Math.cos(a) * r * pulse * 1.55, Math.sin(a) * r * pulse * 1.55);
    ctx.stroke();
  }
  // disc
  const disc = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r * pulse);
  disc.addColorStop(0, '#fff5b8');
  disc.addColorStop(1, theme.light);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.lightStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawMoon(ctx, x, y, r, t, theme) {
  ctx.save();
  ctx.translate(x, y);
  // soft glow halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2);
  halo.addColorStop(0, 'rgba(232, 238, 245, 0.4)');
  halo.addColorStop(1, 'rgba(232, 238, 245, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  // moon body
  const disc = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  disc.addColorStop(0, '#fafcff');
  disc.addColorStop(1, '#c8d1e0');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // craters
  ctx.fillStyle = 'rgba(140, 150, 170, 0.5)';
  const craters = [
    { x: -r * 0.30, y: -r * 0.35, rr: r * 0.18 },
    { x: r * 0.25,  y: -r * 0.10, rr: r * 0.12 },
    { x: r * 0.05,  y:  r * 0.25, rr: r * 0.20 },
    { x: -r * 0.35, y:  r * 0.20, rr: r * 0.10 },
    { x: r * 0.35,  y:  r * 0.35, rr: r * 0.08 },
  ];
  for (const c of craters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120, 130, 150, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ============ CITY ============

function drawCity(ctx, buildings, scrollX, parallaxSpeed, groundY, color, alpha, lit) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const offset = scrollX * parallaxSpeed;
  for (const b of buildings) {
    const x = b.x - (offset % (b.w + 30));
    const y = groundY - b.h;
    ctx.fillRect(x, y, b.w, b.h);
    // antenna/peak on some buildings
    if (b.windows && b.w > 35) {
      ctx.fillRect(x + b.w * 0.4, y - 12, 3, 12);
    }
  }
  // tiny lit windows for night
  if (lit) {
    ctx.fillStyle = `rgba(255, 220, 130, ${0.4 * alpha})`;
    for (const b of buildings) {
      if (!b.windows) continue;
      const x = b.x - (offset % (b.w + 30));
      const y = groundY - b.h;
      const cols = Math.max(2, Math.floor(b.w / 8));
      const rows = Math.max(3, Math.floor(b.h / 12));
      for (let row = 1; row < rows; row += 2) {
        for (let col = 1; col < cols; col += 2) {
          ctx.fillRect(x + col * 6 + 2, y + row * 9 + 4, 2, 3);
        }
      }
    }
  }
  ctx.restore();
}

// ============ BALLOON ============

function drawBalloon(ctx, x, y, size, color, nightSilhouette) {
  ctx.save();
  ctx.translate(x, y);
  // balloon body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.95, size * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // shading
  if (!nightSilhouette) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.25, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // outline
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // bottom triangle (cup)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-size * 0.25, size * 1.05);
  ctx.lineTo(size * 0.25, size * 1.05);
  ctx.lineTo(0, size * 1.30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ropes
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size * 0.18, size * 1.40);
  ctx.lineTo(-size * 0.10, size * 1.05);
  ctx.moveTo(size * 0.18, size * 1.40);
  ctx.lineTo(size * 0.10, size * 1.05);
  ctx.stroke();
  // basket
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(-size * 0.20, size * 1.40, size * 0.40, size * 0.22);
  ctx.strokeRect(-size * 0.20, size * 1.40, size * 0.40, size * 0.22);
  ctx.restore();
}

// ============ CLOUD ============

function drawCloud(ctx, x, y, size, opacity, fill, shadow) {
  ctx.save();
  ctx.globalAlpha = opacity;
  // shadow first (slight offset, darker)
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(x - size * 0.4, y + size * 0.06, size * 0.45, 0, Math.PI * 2);
  ctx.arc(x, y - size * 0.12, size * 0.55, 0, Math.PI * 2);
  ctx.arc(x + size * 0.45, y + size * 0.06, size * 0.48, 0, Math.PI * 2);
  ctx.arc(x + size * 0.15, y + size * 0.26, size * 0.40, 0, Math.PI * 2);
  ctx.fill();
  // top fluff (lighter)
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x - size * 0.4, y, size * 0.45, 0, Math.PI * 2);
  ctx.arc(x, y - size * 0.18, size * 0.55, 0, Math.PI * 2);
  ctx.arc(x + size * 0.45, y, size * 0.48, 0, Math.PI * 2);
  ctx.arc(x + size * 0.15, y + size * 0.20, size * 0.40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
