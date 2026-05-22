// ─── Screen Mesh Switcher ────────────────────────────────────────
const meshMap = {
    worlds: 'mesh-worlds', tech: 'mesh-tech', achievements: 'mesh-achievements',
    top: 'mesh-top', options: 'mesh-options'
};

function switchScreenMesh(target) {
    Object.values(meshMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === meshMap[target] ? '' : 'none';
    });
    // Show AD button only on tech screen (in menu state)
    const adBtn = document.getElementById('btn-ad-global');
    if (adBtn) adBtn.style.display = target === 'tech' && app.state === 'menu' ? '' : 'none';
}

// ─── Canvas elements ─────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const vInd = document.getElementById('vacuum-indicator');

// ─── GamePush SDK stub ──────────────────────────────────────────
window.gpAds = null;

// ─── Vacuum indicator styles ────────────────────────────────────
vInd.style.cssText = 'position:absolute;border:3px dashed var(--primary);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;display:none;z-index:5;box-shadow:0 0 40px rgba(0,242,255,0.2),inset 0 0 40px rgba(0,242,255,0.05);';

// ─── Input handlers ─────────────────────────────────────────────
window.addEventListener('mousemove', e => {
    game.mouse.x = e.clientX;
    game.mouse.y = e.clientY;
    vInd.style.left = e.clientX + 'px';
    vInd.style.top = e.clientY + 'px';
});

window.addEventListener('touchstart', e => {
    const t = e.touches[0];
    game.mouse.x = t.clientX;
    game.mouse.y = t.clientY;
    vInd.style.left = t.clientX + 'px';
    vInd.style.top = t.clientY + 'px';
}, { passive: true });

window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    game.mouse.x = t.clientX;
    game.mouse.y = t.clientY;
    vInd.style.left = t.clientX + 'px';
    vInd.style.top = t.clientY + 'px';
}, { passive: true });

// ─── Start the app ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());