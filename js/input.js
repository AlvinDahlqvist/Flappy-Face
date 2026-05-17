export function onFlap(element, handler) {
  const keyHandler = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handler(e);
    }
  };
  const pointerHandler = (e) => {
    e.preventDefault();
    handler(e);
  };
  element.addEventListener('pointerdown', pointerHandler);
  window.addEventListener('keydown', keyHandler);

  return () => {
    element.removeEventListener('pointerdown', pointerHandler);
    window.removeEventListener('keydown', keyHandler);
  };
}

export function onCanvasPoint(canvas, handlers) {
  let dragging = null;
  let pressTimer = null;
  let downPoint = null;

  // Returns position in CSS pixels (matches ctx.scale(dpr, dpr))
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const onDown = (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = getPos(e);
    downPoint = { ...p, t: Date.now() };
    dragging = handlers.onDown?.(p) ?? null;

    if (handlers.onLongPress) {
      pressTimer = setTimeout(() => {
        handlers.onLongPress(downPoint);
        pressTimer = null;
      }, 500);
    }
  };
  const onMove = (e) => {
    if (!downPoint) return;
    const p = getPos(e);
    if (pressTimer && Math.hypot(p.x - downPoint.x, p.y - downPoint.y) > 10) {
      clearTimeout(pressTimer); pressTimer = null;
    }
    handlers.onDrag?.(p, dragging);
  };
  const onUp = (e) => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!downPoint) return;
    const p = getPos(e);
    const dt = Date.now() - downPoint.t;
    const dist = Math.hypot(p.x - downPoint.x, p.y - downPoint.y);
    if (dt < 400 && dist < 10) {
      handlers.onTap?.(downPoint);
    }
    handlers.onUp?.(p, dragging);
    dragging = null;
    downPoint = null;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
  };
}

// Sizes the canvas backing store for HiDPI and scales its ctx so drawing
// can use CSS pixel coordinates throughout. Returns CSS pixel dimensions.
export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width || canvas.clientWidth || window.innerWidth;
  const cssH = rect.height || canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssW, height: cssH, dpr };
}
