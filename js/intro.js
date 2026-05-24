// js/intro.js — first-run 4-slide tap-through overlay over the menu.

const KEY = 'ff.intro.seen';

const SLIDES = [
  { title: 'WELCOME',  body: 'Upload your face. Become a bird.', target: '#customize-toggle' },
  { title: 'PICK',     body: 'Choose what to do.',                target: '#cat-play' },
  { title: 'OR BUILD', body: 'Make your own level.',             target: '#cat-make' },
  { title: 'GO',       body: "Hit GO. Don't die.",                target: '[data-go="play-random"]' },
];

export function maybeShowIntro({ onComplete } = {}) {
  if (localStorage.getItem(KEY) === '1') return Promise.resolve(false);
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'intro-root';
    document.body.appendChild(root);
    let i = 0;

    function expandCustomize() {
      const t = document.getElementById('customize-toggle');
      const body = document.querySelector('.customize-body');
      if (body && body.hidden) t?.click();
    }

    function render() {
      const s = SLIDES[i];
      const target = document.querySelector(s.target);
      const rect = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      root.innerHTML = `
        <div class="intro-dim"></div>
        <div class="intro-spotlight" style="left:${rect.left - 8}px;top:${rect.top - 8}px;width:${rect.width + 16}px;height:${rect.height + 16}px"></div>
        <div class="intro-card">
          <div class="intro-step">${i + 1} / ${SLIDES.length}</div>
          <div class="intro-title">${s.title}</div>
          <div class="intro-body">${s.body}</div>
          <div class="intro-buttons">
            <button class="btn ghost" id="intro-skip">SKIP</button>
            <button class="btn primary" id="intro-next">${i === SLIDES.length - 1 ? "LET'S GO" : 'NEXT'}</button>
          </div>
        </div>`;
      root.querySelector('#intro-skip').onclick = finish;
      root.querySelector('#intro-next').onclick = next;
      if (s.target === '#customize-toggle') expandCustomize();
    }

    function next() {
      i++;
      if (i >= SLIDES.length) finish();
      else render();
    }

    function finish() {
      try { localStorage.setItem(KEY, '1'); } catch {}
      root.remove();
      onComplete?.();
      resolve(true);
    }

    render();
    window.addEventListener('resize', render);
  });
}
