// ─── Texture Cache (эмодзи → offscreen canvas) ───────────────────
const texCache = {};

function renderEmojiToCanvas(char, size, color, shadowColor, shadowBlur, isRare) {
    const key = `${char}_${size}_${color}_${shadowColor}_${shadowBlur}_${isRare}`;
    if (texCache[key]) return texCache[key];

    const padding = shadowBlur + 10;
    const dim = size + padding;
    const off = document.createElement('canvas');
    off.width = dim;
    off.height = dim;
    const oc = off.getContext('2d');
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.font = `bold ${size}px Arial`;

    const cx = dim / 2;
    const cy = dim / 2;
    oc.shadowBlur = shadowBlur;
    oc.shadowColor = shadowColor;

    if (isRare) {
        oc.strokeStyle = 'rgba(255,204,0,0.4)';
        oc.lineWidth = 2;
        oc.strokeText(char, cx, cy);
    }
    oc.fillStyle = color;
    oc.fillText(char, cx, cy);

    texCache[key] = off;
    return off;
}

// ─── Grid Cache ──────────────────────────────────────────────────
let gridCache = null;
let gridCacheW = 0;
let gridCacheH = 0;

function getGrid(w, h) {
    if (gridCache && gridCacheW === w && gridCacheH === h) return gridCache;
    gridCacheW = w;
    gridCacheH = h;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const oc = off.getContext('2d');
    oc.strokeStyle = 'rgba(255,255,255,0.025)';
    oc.lineWidth = 1;
    for (let x = 0; x < w; x += 80) {
        oc.beginPath();
        oc.moveTo(x + 0.5, 0);
        oc.lineTo(x + 0.5, h);
        oc.stroke();
    }
    for (let y = 0; y < h; y += 80) {
        oc.beginPath();
        oc.moveTo(0, y + 0.5);
        oc.lineTo(w, y + 0.5);
        oc.stroke();
    }
    gridCache = off;
    return off;
}