import { loadPhotos, savePhoto } from './storage.js';

const MAX_DIM = 512;
const JPEG_QUALITY = 0.82;

const imageCache = new Map();

export async function fileToDataUrl(file) {
  const raw = await readFileAsDataUrl(file);
  return await resizeDataUrl(raw, MAX_DIM, JPEG_QUALITY);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function resizeDataUrl(dataUrl, maxDim, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function loadImage(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);
  if (imageCache.has(dataUrl)) return Promise.resolve(imageCache.get(dataUrl));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imageCache.set(dataUrl, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function loadAllPhotos() {
  const photos = loadPhotos();
  const [bird, pipe, bg] = await Promise.all([
    loadImage(photos.bird),
    loadImage(photos.pipe),
    loadImage(photos.bg),
  ]);
  return { bird, pipe, bg, raw: photos };
}

export async function setPhotoFromFile(slot, file) {
  const dataUrl = await fileToDataUrl(file);
  savePhoto(slot, dataUrl);
  const img = await loadImage(dataUrl);
  return { dataUrl, img };
}
