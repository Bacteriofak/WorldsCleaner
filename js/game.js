// ─── Game Engine ────────────────────────────────────────────────
const game = {
    items: [], particles: [], bgParticles: [], world: null, worldKey: '',
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    worldMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    sessionScrap: 0, xp: 0, goal: 80, combo: 0, comboT: 0, shake: 0,
    ingameXP: 0, ingameNext: 300, shieldMult: 1, time: 0,

    // Мир
    WORLD_W: 4000,
    WORLD_H: 4000,
    BASE_SIZE: 72,
    ITEM_SPACING: 84,
    SUCK_RADIUS: 30,

    // Камера
    cameraX: 0, cameraY: 0,
    cameraVX: 0, cameraVY: 0,
    cameraScale: 1, cameraTargetScale: 1,
    MIN_SCALE: 0.35,
    START_SCALE: 1,
    EDGE_SCROLL_MARGIN: 20,
    prevZoomStep: -1,



    prepare(wK) {
        this.worldKey = wK;
        const conf = {
            abyss: {
                bg: '#050410', col: '#00f2ff',
                items: ['⚓', '🍾', '🤿', '⌚', '🪼', '🪸', '🐚', '🧭', '💰'],
            },
            micro: {
                bg: '#0a0410', col: '#ff00ff',
                items: ['🦠', '🧬', '🧪', '💉', '💊', '🔴', '⚪', '💎', '💠'],
            },
            space: {
                bg: '#04040a', col: '#ffaa00',
                items: ['🛰️', '🚀', '💾', '🔧', '🔋', '🩻', '🚪', '🪨', '🔌'],
            }
        };
        this.world = conf[wK];

        this.goal = 80 + ((app.worldLvls[wK] || 1) - 1) * 40;
        this.stats = {
            rad: 100 + (app.tech.radius * 18),
            suc: 0.5 + (app.tech.suction * 0.1),
            rare: 0.03 + (app.tech.rare * 0.04),
            combo: 90 + (app.tech.combo * 40)
        };
        this.shieldMult = Math.max(0.1, 1 - (app.tech.shield || 0) * 0.18);
        this.sessionScrap = 0; this.xp = 0; this.combo = 0; this.shake = 0;
        this.ingameXP = 0; this.ingameNext = 300; this.time = 0;
        this.cameraScale = this.START_SCALE;
        this.cameraTargetScale = this.START_SCALE;
        this.cameraX = canvas.width / 2;
        this.cameraY = canvas.height / 2;
        this.cameraVX = 0; this.cameraVY = 0;
        this.prevZoomStep = -1;
        this.items = []; this.particles = []; this.bgParticles = [];

        Item._speedMult = 1;

        // Bg particles по всему миру
        for (let i = 0; i < 200; i++) {
            this.bgParticles.push({
                x: Math.random() * this.WORLD_W,
                y: Math.random() * this.WORLD_H,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                a: Math.random() * 0.2 + 0.03
            });
        }

        // Заполняем мир предметами по сетке
        const cols = Math.ceil(this.WORLD_W / this.ITEM_SPACING);
        const rows = Math.ceil(this.WORLD_H / this.ITEM_SPACING);
        for (let cy = 0; cy < rows; cy++) {
            for (let cx = 0; cx < cols; cx++) {
                const x = cx * this.ITEM_SPACING + this.ITEM_SPACING / 2 + (Math.random() - 0.5) * 6;
                const y = cy * this.ITEM_SPACING + this.ITEM_SPACING / 2 + (Math.random() - 0.5) * 6;
                if (x < 0 || x > this.WORLD_W || y < 0 || y > this.WORLD_H) continue;
                const item = new Item(true);
                item.x = x;
                item.y = y;
                this.items.push(item);
            }
        }

        this.updateUI();
    },

    screenToWorld(sx, sy) {
        const cs = this.cameraScale;
        const cw = canvas.width, ch = canvas.height;
        return {
            x: (sx - cw / 2) / cs + this.cameraX,
            y: (sy - ch / 2) / cs + this.cameraY
        };
    },

    updateUI() {
        document.getElementById('hud-xp').innerText = this.xp;
        document.getElementById('hud-goal').innerText = this.goal;
        document.getElementById('hud-scrap').innerText = Math.floor(this.sessionScrap);
        document.getElementById('xp-fill').style.width = (this.xp / this.goal * 100) + '%';
        // Initial vacuum indicator size (will be scaled by camera in render)
        vInd.style.width = (this.stats.rad * 2) + 'px';
        vInd.style.height = (this.stats.rad * 2) + 'px';
    },

    showRogue() {
        app.state = 'rogue';
        const c = document.getElementById('rogue-list');
        c.innerHTML = '';
        const pool = [
            { n: '💫 Супер Магнит', desc: '+60 к радиусу', f: () => { this.stats.rad += 60; } },
            { n: '⚡ Гипер Тяга', desc: '+1.0 к силе', f: () => { this.stats.suc += 1.0; } },
            { n: '💰 Бонус Скрап', desc: '+500 монет', f: () => { this.sessionScrap += 500; } },
            { n: '🛡️ Защитное поле', desc: 'Иммунитет к ☣️ 15 сек', f: () => { this.shieldMult = 0; setTimeout(() => { this.shieldMult = Math.max(0.1, 1 - (app.tech.shield || 0) * 0.18); }, 15000); } },
            { n: '⏱️ Замедление', desc: 'Всё медленнее на 10 сек', f: () => { Item._speedMult = 0.2; setTimeout(() => { Item._speedMult = 1; }, 10000); } },
            { n: '🌟 Золотая лихорадка', desc: 'Много Rare на 20 сек', f: () => { const old = this.stats.rare; this.stats.rare = 0.4; setTimeout(() => { this.stats.rare = old; }, 20000); } }
        ];
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach(o => {
            const b = document.createElement('button');
            b.className = 'btn btn-play';
            b.style.width = '100%';
            b.style.display = 'flex';
            b.style.flexDirection = 'column';
            b.style.alignItems = 'center';
            b.style.padding = '12px';
            b.innerHTML = `<span style="font-size:16px;">${o.n}</span><small style="font-weight:400;font-size:11px;opacity:0.7;margin-top:4px;">${o.desc}</small>`;
            b.onclick = () => {
                o.f();
                Item._speedMult = Item._speedMult || 1;
                this.updateUI();
                app.hideModal('rogue-modal');
                app.state = 'game';
            };
            c.appendChild(b);
        });
        app.showModal('rogue-modal');
    },

    addParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color));
    },

    // Спавн предметов в области
    spawnItemsInRect(l, r, t, b) {
        const startCx = Math.max(0, Math.floor(l / this.ITEM_SPACING));
        const endCx = Math.min(Math.ceil(this.WORLD_W / this.ITEM_SPACING), Math.ceil(r / this.ITEM_SPACING));
        const startCy = Math.max(0, Math.floor(t / this.ITEM_SPACING));
        const endCy = Math.min(Math.ceil(this.WORLD_H / this.ITEM_SPACING), Math.ceil(b / this.ITEM_SPACING));

        for (let cy = startCy; cy < endCy; cy++) {
            for (let cx = startCx; cx < endCx; cx++) {
                const x = cx * this.ITEM_SPACING + this.ITEM_SPACING / 2;
                const y = cy * this.ITEM_SPACING + this.ITEM_SPACING / 2;
                let hasItem = false;
                for (let i = 0; i < this.items.length; i++) {
                    const it = this.items[i];
                    if (Math.abs(it.x - x) < this.ITEM_SPACING / 2 && Math.abs(it.y - y) < this.ITEM_SPACING / 2) {
                        hasItem = true;
                        break;
                    }
                }
                if (!hasItem) {
                    const item = new Item(true);
                    item.x = x + (Math.random() - 0.5) * 6;
                    item.y = y + (Math.random() - 0.5) * 6;
                    this.items.push(item);
                }
            }
        }
    },

    update() {
        this.time++;
        const w = canvas.width, h = canvas.height;
        const mx = this.mouse.x, my = this.mouse.y;

        // ─── Edge scroll ──────────────────────────────────────
        let scrollDX = 0, scrollDY = 0;
        const margin = this.EDGE_SCROLL_MARGIN;
        if (mx < margin) scrollDX = -1;
        else if (mx > w - margin) scrollDX = 1;
        if (my < margin) scrollDY = -1;
        else if (my > h - margin) scrollDY = 1;

        const scrollSpeed = 8;
        this.cameraVX += (scrollDX * scrollSpeed - this.cameraVX) * 0.12;
        this.cameraVY += (scrollDY * scrollSpeed - this.cameraVY) * 0.12;

        this.cameraX = Math.max(w / 2, Math.min(this.WORLD_W - w / 2, this.cameraX + this.cameraVX));
        this.cameraY = Math.max(h / 2, Math.min(this.WORLD_H - h / 2, this.cameraY + this.cameraVY));

        // ─── World mouse ──────────────────────────────────────
        const world = this.screenToWorld(mx, my);
        this.worldMouse.x = world.x;
        this.worldMouse.y = world.y;

        // ─── Zoom camera out as player progresses ──────────
        const progress = this.goal > 0 ? this.xp / this.goal : 0;
        const zoomStep = Math.min(3, Math.floor(progress / 0.25));
        if (zoomStep !== this.prevZoomStep) {
            this.prevZoomStep = zoomStep;
            this.cameraTargetScale = Math.max(this.MIN_SCALE, this.START_SCALE - zoomStep * 0.22);
        }
        this.cameraScale += (this.cameraTargetScale - this.cameraScale) * 0.04;

        // ─── Bg particles ─────────────────────────────────────
        for (let i = 0; i < this.bgParticles.length; i++) {
            const p = this.bgParticles[i];
            p.x += p.vx; p.y += p.vy;
            if (p.x < -10) p.x = this.WORLD_W + 10; else if (p.x > this.WORLD_W + 10) p.x = -10;
            if (p.y < -10) p.y = this.WORLD_H + 10; else if (p.y > this.WORLD_H + 10) p.y = -10;
        }

        // ─── Items culling ────────────────────────────────────
        const cs = this.cameraScale;
        const hw = (w / cs) / 2 + 150;
        const hh = (h / cs) / 2 + 150;
        const visLeft = this.cameraX - hw;
        const visRight = this.cameraX + hw;
        const visTop = this.cameraY - hh;
        const visBottom = this.cameraY + hh;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            if (it.x < visLeft - 300 || it.x > visRight + 300 || it.y < visTop - 300 || it.y > visBottom + 300) {
                it.rotation += it.rotationSpeed;
                continue;
            }
            it.update();
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        if (this.shake > 0) this.shake *= 0.9;
        if (this.comboT > 0) {
            this.comboT--;
            if (this.comboT <= 0) { this.combo = 0; document.getElementById('combo-txt').style.display = 'none'; }
        }
    },

    render() {
        const cw = canvas.width, ch = canvas.height;
        const cs = this.cameraScale;

        // ─── Update vacuum indicator size with camera scale ────
        // Keep vacuum radius visually proportional as camera zooms out
        const vacuumScreenRadius = (this.stats.rad * 2) / cs;
        vInd.style.width = vacuumScreenRadius + 'px';
        vInd.style.height = vacuumScreenRadius + 'px';

        // ─── Шаг 1: заливаем весь экран чёрным ──────────────
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();

        // ─── Шаг 2: camera transform ─────────────────────────
        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(cs, cs);
        ctx.translate(-this.cameraX, -this.cameraY);

        if (this.shake > 0.5) ctx.translate(
            (Math.random() - 0.5) * this.shake,
            (Math.random() - 0.5) * this.shake
        );

        // ─── Шаг 3: clip rendering to world bounds only ──────
        ctx.beginPath();
        ctx.rect(0, 0, this.WORLD_W, this.WORLD_H);
        ctx.clip();

        // ─── Шаг 4: рисуем мир ───────────────────────────────
        ctx.fillStyle = this.world.bg;
        ctx.fillRect(0, 0, this.WORLD_W, this.WORLD_H);
        ctx.drawImage(getGrid(this.WORLD_W, this.WORLD_H), 0, 0);

        // Visible bounds for culling
        const hw = (cw / cs) / 2 + 50;
        const hh = (ch / cs) / 2 + 50;
        const visLeft = this.cameraX - hw;
        const visRight = this.cameraX + hw;
        const visTop = this.cameraY - hh;
        const visBottom = this.cameraY + hh;

        // bgParticles
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.world.col;
        for (let i = 0; i < this.bgParticles.length; i++) {
            const p = this.bgParticles[i];
            if (p.x < visLeft || p.x > visRight || p.y < visTop || p.y > visBottom) continue;
            ctx.globalAlpha = p.a;
            ctx.fillText('•', p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // Items
        for (let i = 0; i < this.items.length; i++) {
            const it = this.items[i];
            if (it.x < visLeft || it.x > visRight || it.y < visTop || it.y > visBottom) continue;
            it.draw();
        }

        // Particles
        for (let i = 0; i < this.particles.length; i++) this.particles[i].draw();

        ctx.restore();

        // ─── Suck circle (screen-space) ──────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.mouse.x, this.mouse.y, this.SUCK_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
};

// ─── Item Class ─────────────────────────────────────────────────
class Item {
    static _speedMult = 1;
    static _baseTexCache = new Map();

    constructor(init) { this.reset(init); }

    reset(init) {
        const r = Math.random();
        this.isHazard = r < 0.06;
        this.isRare = !this.isHazard && r > (1 - game.stats.rare);
        this.char = this.isHazard ? '☣️' : game.world.items[Math.floor(Math.random() * 9)];
        this.baseSize = game.BASE_SIZE;
        this.size = this.baseSize;
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        if (this.isHazard) {
            this.vx = (Math.random() - 0.5) * 0.6;
            this.vy = (Math.random() - 0.5) * 0.6;
        }
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.008;
    }

    _getBaseTexture() {
        const key = `${this.char}_${this.baseSize}_${this.isRare}_${this.isHazard}`;
        if (Item._baseTexCache.has(key)) return Item._baseTexCache.get(key);
        const col = this.isRare ? '#ffcc00' : '#fff';
        const sCol = this.isHazard ? '#ff0055' : (this.isRare ? '#ffcc00' : game.world.col);
        const sBlur = this.isHazard ? 40 : (this.isRare ? 50 : 25);
        const tex = renderEmojiToCanvas(this.char, this.baseSize, col, sCol, sBlur, this.isRare);
        Item._baseTexCache.set(key, tex);
        return tex;
    }

    update() {
        if (app.state !== 'game') return;
        this.rotation += this.rotationSpeed;

        if (this.isHazard) {
            this.x += this.vx; this.y += this.vy;
            if (this.x < -100 || this.x > game.WORLD_W + 100 || this.y < -100 || this.y > game.WORLD_H + 100) {
                this.x = Math.random() * game.WORLD_W;
                this.y = Math.random() * game.WORLD_H;
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = (Math.random() - 0.5) * 0.6;
            }
        }

        const wx = game.worldMouse.x, wy = game.worldMouse.y;
        const dx = wx - this.x, dy = wy - this.y;
        const distSq = dx * dx + dy * dy;
        const rad = game.stats.rad;

        if (distSq < rad * rad) {
            const d = Math.sqrt(distSq);
            const t = 1 - (d / rad);
            this.rotation += t * t * 0.05 * (this.rotationSpeed >= 0 ? 1 : -1);
            const force = t * t * 4 * game.stats.suc * (this.isHazard ? 0.3 : 1);
            if (d > 0.1) {
                this.vx += (dx / d) * force * 0.08;
                this.vy += (dy / d) * force * 0.08;
            }
            this.size = Math.max(10, this.size * 0.97);

            // Радиус сбора в мировых координатах
            const suckRWorld = game.SUCK_RADIUS / game.cameraScale;

            if (d < suckRWorld) {
                if (this.isHazard) {
                    const penalty = Math.max(30, Math.floor(150 * game.shieldMult));
                    game.sessionScrap = Math.max(0, game.sessionScrap - penalty);
                    game.combo = 0; game.comboT = 0;
                    document.getElementById('combo-txt').style.display = 'none';
                    game.shake = 20; audio.play(100, 'sawtooth', 0.3, 0.25);
                    game.addParticles(this.x, this.y, '#ff0055', 10);
                    this.x = Math.random() * game.WORLD_W;
                    this.y = Math.random() * game.WORLD_H;
                    this.vx = (Math.random() - 0.5) * 0.6;
                    this.vy = (Math.random() - 0.5) * 0.6;
                    this.size = this.baseSize;
                    this.rotation = Math.random() * Math.PI * 2;
                } else {
                    game.xp++; game.combo++; game.comboT = game.stats.combo;
                    const xpGain = 1 + Math.floor((game.goal - 80) / 40);
                    game.ingameXP += 8 * xpGain;
                    const score = (this.isRare ? 150 : 35) * game.combo;
                    game.sessionScrap += score;
                    game.addParticles(this.x, this.y, this.isRare ? '#ffcc00' : game.world.col, 8);

                    if (game.combo > 1) {
                        const el = document.getElementById('combo-txt');
                        el.innerText = `X${game.combo}!`;
                        el.style.display = 'block';
                        el.style.animation = 'none';
                        void el.offsetHeight;
                        el.style.animation = 'comboPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    }
                    audio.play(300 + game.xp * 12, 'sine', 0.08, 0.12);

                    if (game.ingameXP >= game.ingameNext) {
                        game.ingameXP = 0;
                        game.showRogue();
                    }
                    if (game.xp >= game.goal) {
                        app.state = 'win';
                        document.getElementById('win-scrap-total').innerText = game.sessionScrap;
                        document.getElementById('btn-double').style.display = '';
                        app.showModal('win-modal');
                        vInd.style.display = 'none';
                        audio.stopMusic();
                        audio.play(1200, 'sine', 0.5, 0.4);
                        const cols = ['#ffcc00', '#00f2ff', '#ff00ff', '#ff0055', '#00ff88'];
                        for (let i = 0; i < 80; i++) {
                            game.particles.push(new Particle(
                                Math.random() * game.WORLD_W,
                                Math.random() * game.WORLD_H,
                                cols[Math.floor(Math.random() * 5)]
                            ));
                        }
                    }

                    const side = Math.floor(Math.random() * 4);
                    switch (side) {
                        case 0: this.x = -40; this.y = Math.random() * game.WORLD_H; break;
                        case 1: this.x = game.WORLD_W + 40; this.y = Math.random() * game.WORLD_H; break;
                        case 2: this.x = Math.random() * game.WORLD_W; this.y = -40; break;
                        case 3: this.x = Math.random() * game.WORLD_W; this.y = game.WORLD_H + 40; break;
                    }
                    this.size = this.baseSize;
                    this.rotation = Math.random() * Math.PI * 2;
                    this.char = game.world.items[Math.floor(Math.random() * 9)];
                    this.isRare = Math.random() > (1 - game.stats.rare);
                    this.isHazard = false;
                }
                game.updateUI();
            }
        }

        if (!this.isHazard) {
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw() {
        const tex = this._getBaseTexture();
        const s = this.size / this.baseSize;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(s, s);
        ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
        ctx.restore();
    }
}

// ─── Particle ───────────────────────────────────────────────────
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1;
        this.size = Math.random() * 2 + 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.3;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.94; this.vy *= 0.94;
        this.life -= 0.04;
        this.rotation += this.rotSpeed;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        ctx.restore();
    }
}