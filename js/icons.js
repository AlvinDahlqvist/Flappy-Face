// js/icons.js — chunky pixel glyphs replacing emoji in UI chrome.
//
// iconSvg(name): returns an HTMLElement <span class="icon"> containing an inline SVG.
// iconCanvas(name, ctx, size, color): draws into the given 2D context centered at (0,0).

const VIEW = 16; // 16x16 design grid for pixel-perfect look

const PATHS = {
  // Each entry is an array of <path d="..."> strings rendered in the current color.
  coin:      ['M5 3h6v1h1v1h1v6h-1v1h-1v1H5v-1H4v-1H3V5h1V4h1V3z M6 6h4v4H6V6z'],
  near:      ['M7 2h2v7H7V2z M7 11h2v2H7v-2z'],
  flame:     ['M8 2l2 3-1 1 2 2-1 2 2 2-3 2H7L4 12l2-2-1-2 2-2-1-1 2-3z'],
  runs:      ['M4 3v10l8-5z'],
  skull:     ['M5 3h6v1h1v6h-2v3H6v-3H4V4h1V3z M6 6h1v2H6V6z M9 6h1v2H9V6z'],
  gear:      ['M7 1h2v2h1l2-1 1 1-1 2 1 1 2 0v2l-2 0-1 1 1 2-1 1-2-1-1 1v2H7v-2l-1-1-2 1-1-1 1-2-1-1H1V8h2l1-1-1-2 1-1 2 1 1-1V1z M7 6h2v4H7V6z'],
  close:     ['M3 3l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z'],
  pause:     ['M4 3h3v10H4V3z M9 3h3v10H9V3z'],
  speaker:   ['M8 3L5 6H3v4h2l3 3V3z'],
  speakerX:  ['M8 3L5 6H3v4h2l3 3V3z M11 6l3 3 M14 6l-3 3'],
  sparkle:   ['M8 2v4l3-1-1 3h4l-4 1 1 3-3-1v4l-1-4-3 1 1-3H1l4-1-1-3 3 1V2z'],
  lock:      ['M5 7V5a3 3 0 0 1 6 0v2h1v6H4V7h1z M7 5a1 1 0 0 0-1 0v2h2V5a1 1 0 0 0-1 0z'],
  share:     ['M11 2L8 5h2v5h2V5h2l-3-3z M3 8v6h10V8h-2v4H5V8H3z'],
  undo:      ['M5 4v2H2l4 4 4-4H7V4H5z M2 11h12v2H2z'],
  redo:      ['M11 4v2h3l-4 4-4-4h3V4h2z M2 11h12v2H2z'],
  grid:      ['M3 3h10v10H3V3z M3 7h10 M3 11h10 M7 3v10 M11 3v10'],
};

const NEEDS_STROKE = new Set(['speakerX', 'grid']);

export function iconSvg(name, opts = {}) {
  const color = opts.color || 'currentColor';
  const size  = opts.size || '1em';
  const paths = PATHS[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  const stroke = NEEDS_STROKE.has(name);
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  if (opts.title) span.setAttribute('aria-label', opts.title);
  span.style.width = size;
  span.style.height = size;
  span.innerHTML = `
    <svg viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
      ${paths.map(d =>
        stroke
          ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="1" />`
          : `<path d="${d}" fill="${color}" />`
      ).join('')}
    </svg>`;
  return span;
}

// Draws the icon into the given 2D context, with the icon centered at the current origin.
// `size` is the bounding pixel size; `color` may be any fillStyle value.
export function iconCanvas(name, ctx, size, color = '#ffd166') {
  const paths = PATHS[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  // SVG path => Path2D
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(size / VIEW, size / VIEW);
  for (const d of paths) {
    const p = new Path2D(d);
    if (NEEDS_STROKE.has(name)) ctx.stroke(p); else ctx.fill(p);
  }
  ctx.restore();
}
