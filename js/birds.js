// 8 preset bird avatars + 1 "your photo" slot.
// Each bird has a `draw(ctx, radius)` that paints onto a coordinate system
// where (0, 0) is the bird's center, and an `unlock` spec used by achievements.

export const PHOTO_BIRD_ID = 'photo';

export const BIRDS = {
  buddy: {
    id: 'buddy',
    name: 'BUDDY',
    desc: 'The OG.',
    unlock: { type: 'default' },
    wingFill: '#fff8d6',
    wingStroke: '#c9a740',
    draw: drawBuddy,
  },
  punk: {
    id: 'punk',
    name: 'PUNK',
    desc: 'Too cool.',
    unlock: { type: 'score', value: 5 },
    wingFill: '#ffd0e0',
    wingStroke: '#c14878',
    draw: drawPunk,
  },
  chill: {
    id: 'chill',
    name: 'CHILL',
    desc: 'Vibing only.',
    unlock: { type: 'score', value: 15 },
    wingFill: '#cce8f4',
    wingStroke: '#1d6a8a',
    draw: drawChill,
  },
  royal: {
    id: 'royal',
    name: 'ROYAL',
    desc: 'A whole monarch.',
    unlock: { type: 'score', value: 30 },
    wingFill: '#e6d2ef',
    wingStroke: '#7d4787',
    draw: drawRoyal,
  },
  ghost: {
    id: 'ghost',
    name: 'GHOST',
    desc: 'Unbothered. Dead.',
    unlock: { type: 'deaths', value: 20 },
    wingFill: 'rgba(255,255,255,0.75)',
    wingStroke: '#aabad4',
    draw: drawGhost,
  },
  rainbow: {
    id: 'rainbow',
    name: 'RAINBOW',
    desc: 'Pure energy.',
    unlock: { type: 'score', value: 50 },
    wingFill: '#ffffff',
    wingStroke: '#666',
    draw: drawRainbow,
  },
  pizza: {
    id: 'pizza',
    name: 'PIZZA',
    desc: 'Bird of the gods.',
    unlock: { type: 'easter', hint: 'Found by clicking around', statKey: 'titleClicks', value: 15 },
    wingFill: '#fff1c8',
    wingStroke: '#b87333',
    draw: drawPizza,
  },
  daredevil: {
    id: 'daredevil',
    name: 'DAREDEVIL',
    desc: 'Lives for the scrape.',
    unlock: { type: 'nearMisses', value: 10 },
    wingFill: '#ffb8a8',
    wingStroke: '#a83020',
    draw: drawDaredevil,
  },
  collector: {
    id: 'collector',
    name: 'COLLECTOR',
    desc: 'Gotta catch em.',
    unlock: { type: 'coins', value: 100 },
    wingFill: '#d4f0c0',
    wingStroke: '#4a7028',
    draw: drawCollector,
  },
  legend: {
    id: 'legend',
    name: 'LEGEND',
    desc: 'You are a problem.',
    unlock: { type: 'score', value: 100 },
    wingFill: '#fff2ad',
    wingStroke: '#c08a00',
    draw: drawLegend,
  },
};

export function getBird(id) { return BIRDS[id] || BIRDS.buddy; }

// Single back-wing, shared between in-game render and the menu hero animation.
// flap value: 0 = wing hangs back, 1 = wing raised high
export function drawWing(ctx, birdR, flap, fill = '#fff8d6', stroke = '#c9a740') {
  ctx.save();
  ctx.translate(-birdR * 0.25, -birdR * 0.1);
  const angleDeg = 30 - flap * 95;
  ctx.rotate(angleDeg * Math.PI / 180);
  const wlen = birdR * 1.35;
  const wwid = birdR * 0.55;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-wlen * 0.5, -wwid * 0.95, -wlen, -wwid * 0.15);
  ctx.quadraticCurveTo(-wlen * 0.7, wwid * 0.65, 0, wwid * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-wlen * 0.2, wwid * 0.12);
  ctx.lineTo(-wlen * 0.9, -wwid * 0.05);
  ctx.stroke();
  ctx.restore();
}

export function unlockText(unlock) {
  switch (unlock.type) {
    case 'default': return 'Always yours';
    case 'score': return `Score ${unlock.value} in a run`;
    case 'deaths': return `Crash ${unlock.value} times`;
    case 'maps': return `Beat ${unlock.value} custom maps`;
    case 'coins': return `Collect ${unlock.value} coins`;
    case 'nearMisses': return `${unlock.value} near-misses in a run`;
    case 'easter': return unlock.hint || 'Secret';
    default: return '???';
  }
}

// ============ DRAW HELPERS ============

// Body with built-in radial gradient (light top-left → main → dark bottom-right)
// and a thick dark outline. Pass `light` and `dark` for the gradient stops.
function shadedBody(ctx, r, light, main, dark, outline = '#1a1a2e') {
  const g = ctx.createRadialGradient(pxSnap(-r * 0.35), pxSnap(-r * 0.4), pxSnap(r * 0.1), 0, 0, pxSnap(r * 1.15));
  g.addColorStop(0, light);
  g.addColorStop(0.55, main);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, pxSnap(r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(pxSnap(-r * 0.35), pxSnap(-r * 0.45), pxSnap(r * 0.35), pxSnap(r * 0.18), -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(2, r * 0.085);
  ctx.beginPath();
  ctx.arc(0, 0, pxSnap(r), 0, Math.PI * 2);
  ctx.stroke();
}

function circleBody(ctx, r, fill, stroke = '#1a1a2e') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, r * 0.085);
  ctx.stroke();
}

function standardEye(ctx, r) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.30), pxSnap(-r * 0.18), pxSnap(r * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.36), pxSnap(-r * 0.14), pxSnap(r * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.40), pxSnap(-r * 0.20), pxSnap(r * 0.06), 0, Math.PI * 2);
  ctx.fill();
}

function beak(ctx, r, color = '#ef476f', dark = '#b8323d') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(-r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(-r * 0.20));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.02));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.20));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(-r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(-r * 0.20));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.20));
  ctx.lineTo(pxSnap(r * 0.55), pxSnap(r * 0.02));
  ctx.closePath();
  ctx.stroke();
}

function cheek(ctx, r, color = 'rgba(239, 71, 111, 0.55)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.05), pxSnap(r * 0.30), pxSnap(r * 0.20), 0, Math.PI * 2);
  ctx.fill();
}

// Round to nearest integer pixel — sharpens the procedural sprites against the
// parallax scene. Used by shared body / eye / beak / cheek helpers.
function pxSnap(v) { return Math.round(v); }

// Tail feathers — 1-2 angled triangles behind the body.
// style: 'fan' (default, two triangles), 'point' (single), 'wispy' (translucent for ghost)
function tailFeathers(ctx, r, fill, stroke = '#1a1a2e', style = 'fan') {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.strokeStyle = stroke;

  if (style === 'wispy') {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.quadraticCurveTo(-r * 1.65, -r * 0.20, -r * 1.40, r * 0.25);
    ctx.quadraticCurveTo(-r * 1.10, r * 0.05, -r * 0.95, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'point') {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.15);
    ctx.lineTo(-r * 1.55, 0);
    ctx.lineTo(-r * 0.85, r * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 'fan' (default): upper + lower triangle
  ctx.fillStyle = fill;
  // upper triangle
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.20);
  ctx.lineTo(-r * 1.45, -r * 0.35);
  ctx.lineTo(-r * 0.85, r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lower triangle
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.02);
  ctx.lineTo(-r * 1.50, r * 0.10);
  ctx.lineTo(-r * 0.85, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ============ BIRDS ============

function drawBuddy(ctx, r) {
  tailFeathers(ctx, r, '#ffd166');
  shadedBody(ctx, r, '#fff2a8', '#ffd166', '#c8961c');
  cheek(ctx, r);
  standardEye(ctx, r);
  beak(ctx, r);
}

function drawPunk(ctx, r) {
  tailFeathers(ctx, r, '#ec4899', '#1a1a2e', 'fan');
  shadedBody(ctx, r, '#ffb0d2', '#ec4899', '#a8336b');
  cheek(ctx, r, 'rgba(255, 80, 130, 0.6)');
  beak(ctx, r, '#fb923c', '#a04a0d');
  // sunglasses — two black ovals + a bridge
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(-r * 0.20, -r * 0.12, r * 0.30, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.12, r * 0.30, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2.5, r * 0.10);
  ctx.beginPath();
  ctx.moveTo(r * 0.06, -r * 0.12);
  ctx.lineTo(r * 0.10, -r * 0.12);
  ctx.stroke();
  // glasses highlight
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.20, r * 0.09, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.24, -r * 0.20, r * 0.09, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChill(ctx, r) {
  tailFeathers(ctx, r, '#118ab2', '#1a1a2e', 'fan');
  shadedBody(ctx, r, '#7fcfe6', '#118ab2', '#0a5b7a');
  cheek(ctx, r, 'rgba(80, 180, 220, 0.55)');
  beak(ctx, r, '#ffa657', '#a45d18');
  // half-closed eye (chill)
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2.5, r * 0.10);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.10, -r * 0.12);
  ctx.lineTo(r * 0.50, -r * 0.18);
  ctx.stroke();
  // headphones
  ctx.strokeStyle = '#2d3a4a';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();
  ctx.fillStyle = '#2d3a4a';
  ctx.beginPath();
  ctx.ellipse(-r * 0.82, -r * 0.22, r * 0.20, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#ef476f';
  ctx.beginPath();
  ctx.arc(-r * 0.82, -r * 0.22, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoyal(ctx, r) {
  tailFeathers(ctx, r, '#a86bb4', '#1a1a2e', 'fan');
  shadedBody(ctx, r, '#d8a8e0', '#a86bb4', '#6e3a7a');
  cheek(ctx, r, 'rgba(220, 140, 220, 0.55)');
  standardEye(ctx, r);
  beak(ctx, r, '#ffd166', '#a8782e');
  // crown
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(-r * 0.60, -r * 0.85);
  ctx.lineTo(-r * 0.45, -r * 1.20);
  ctx.lineTo(-r * 0.18, -r * 0.92);
  ctx.lineTo(0,         -r * 1.28);
  ctx.lineTo(r * 0.18,  -r * 0.92);
  ctx.lineTo(r * 0.45,  -r * 1.20);
  ctx.lineTo(r * 0.60,  -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ruby
  ctx.fillStyle = '#ef476f';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, -r * 0.98, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // crown shine
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-r * 0.50, -r * 1.05, r * 0.08, r * 0.10);
}

function drawGhost(ctx, r) {
  tailFeathers(ctx, r, 'rgba(255,255,255,0.6)', 'rgba(170,186,212,0.7)', 'wispy');
  // build ghost shape path
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, Math.PI * 2);
  ctx.lineTo(r, r * 0.5);
  const bumps = 4;
  for (let i = 0; i < bumps; i++) {
    const x1 = r - (i + 0.5) * (2 * r / bumps);
    ctx.quadraticCurveTo(x1, r * 0.9, x1 - (r / bumps), r * 0.5);
  }
  ctx.lineTo(-r, 0);
  ctx.closePath();
  // gradient body
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(190,210,240,0.75)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2, r * 0.085);
  ctx.stroke();
  // hollow eyes
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.22, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.28, -r * 0.22, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // tiny white sparkles in eyes
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-r * 0.20, -r * 0.27, r * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.33, -r * 0.27, r * 0.04, 0, Math.PI * 2);
  ctx.fill();
  // sad mouth
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2.5, r * 0.10);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.22, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function drawRainbow(ctx, r) {
  tailFeathers(ctx, r, '#a86bb4', '#1a1a2e', 'point');
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const colors = ['#ef476f', '#ffa657', '#ffd166', '#06d6a0', '#118ab2', '#a86bb4'];
  const sw = (r * 2) / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(-r + i * sw, -r, sw + 0.5, r * 2);
  }
  // gradient overlay for depth
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  // outline
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2, r * 0.085);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  standardEye(ctx, r);
  beak(ctx, r);
}

function drawPizza(ctx, r) {
  tailFeathers(ctx, r, '#b87333', '#1a1a2e', 'fan');
  // cheese body with shading
  shadedBody(ctx, r, '#fee489', '#f4c430', '#b88e10', '#7a4f00');
  // crust ring
  ctx.strokeStyle = '#b87333';
  ctx.lineWidth = r * 0.20;
  ctx.beginPath();
  ctx.arc(0, 0, r - r * 0.10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r - r * 0.20, 0, Math.PI * 2);
  ctx.stroke();
  // pepperoni spots with darker outline
  const peps = [
    { x: -r * 0.30, y: -r * 0.25, rr: r * 0.18 },
    { x:  r * 0.20, y: -r * 0.35, rr: r * 0.14 },
    { x:  r * 0.40, y:  r * 0.05, rr: r * 0.15 },
    { x: -r * 0.05, y:  r * 0.30, rr: r * 0.16 },
    { x: -r * 0.40, y:  r * 0.18, rr: r * 0.12 },
  ];
  for (const p of peps) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a1d18';
    ctx.beginPath();
    ctx.arc(p.x + p.rr * 0.3, p.y + p.rr * 0.3, p.rr * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // basil dots
  ctx.fillStyle = '#2f8a3a';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // tiny single eye top-left
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.55, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(r * 0.34, -r * 0.52, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawDaredevil(ctx, r) {
  tailFeathers(ctx, r, '#e63b3b', '#1a1a2e', 'point');
  shadedBody(ctx, r, '#ff8a7e', '#e63b3b', '#8e1e1e');
  cheek(ctx, r, 'rgba(255, 100, 100, 0.55)');
  // wide nervous eye
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(r * 0.28, -r * 0.18, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // pupil shifted right (looking ahead)
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.15, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  // angry V eyebrow
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2.5, r * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.55);
  ctx.lineTo(r * 0.30, -r * 0.42);
  ctx.lineTo(r * 0.60, -r * 0.55);
  ctx.stroke();
  // sweat drop
  ctx.fillStyle = '#7fc8e0';
  ctx.strokeStyle = '#2d6e90';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.25);
  ctx.quadraticCurveTo(-r * 0.65, -r * 0.10, -r * 0.55, r * 0.05);
  ctx.quadraticCurveTo(-r * 0.45, -r * 0.10, -r * 0.55, -r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  beak(ctx, r, '#ffd166', '#a8782e');
}

function drawCollector(ctx, r) {
  tailFeathers(ctx, r, '#79c244', '#1a1a2e', 'fan');
  shadedBody(ctx, r, '#cef0a8', '#79c244', '#3d6e20');
  cheek(ctx, r, 'rgba(120, 200, 80, 0.55)');
  standardEye(ctx, r);
  beak(ctx, r, '#ffd166', '#a8782e');
  // little gold coin patches on body
  const coins = [
    { x: -r * 0.40, y:  r * 0.15, rr: r * 0.13 },
    { x: -r * 0.10, y:  r * 0.45, rr: r * 0.11 },
    { x:  r * 0.45, y:  r * 0.35, rr: r * 0.14 },
  ];
  for (const c of coins) {
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#7a4f00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // tiny star on each
    ctx.fillStyle = '#7a4f00';
    ctx.font = `${c.rr * 1.8}px "Bungee", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', c.x, c.y + 1);
  }
}

function drawLegend(ctx, r) {
  tailFeathers(ctx, r, '#ffd166', '#1a1a2e', 'fan');
  shadedBody(ctx, r, '#fff6a8', '#ffd166', '#b8861d', '#1a1a2e');
  cheek(ctx, r, 'rgba(255, 105, 130, 0.55)');
  standardEye(ctx, r);
  beak(ctx, r, '#ef476f', '#7a1d31');
  // crown
  ctx.fillStyle = '#ffe599';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(-r * 0.50, -r * 0.80);
  ctx.lineTo(-r * 0.32, -r * 1.10);
  ctx.lineTo(-r * 0.10, -r * 0.85);
  ctx.lineTo(0,         -r * 1.20);
  ctx.lineTo(r * 0.10,  -r * 0.85);
  ctx.lineTo(r * 0.32,  -r * 1.10);
  ctx.lineTo(r * 0.50,  -r * 0.80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ef476f';
  ctx.beginPath();
  ctx.arc(0, -r * 0.96, r * 0.10, 0, Math.PI * 2);
  ctx.fill();
  // halo (double ring)
  ctx.strokeStyle = '#fffa8a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.45, r * 0.68, r * 0.20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.45, r * 0.68, r * 0.20, 0, 0, Math.PI * 2);
  ctx.stroke();
}
