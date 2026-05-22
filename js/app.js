// ─── Application (Menu, UI, Tech Tree, Achievements, Save) ─────
const app = {
    scrap: parseInt(localStorage.getItem('tf_v15_scrap')) || 0,
    displayScrap: parseInt(localStorage.getItem('tf_v15_scrap')) || 0,
    best: parseInt(localStorage.getItem('tf_v15_best')) || 0,
    totalLvl: parseInt(localStorage.getItem('tf_v15_total')) || 1,
    worldLvls: JSON.parse(localStorage.getItem('tf_v15_wlvls')) || { abyss: 1, micro: 1, space: 1 },
    tech: JSON.parse(localStorage.getItem('tf_v15_tech')) || { radius: 0, suction: 0, rare: 0, combo: 0, shield: 0 },
    ach: JSON.parse(localStorage.getItem('tf_v15_ach')) || { collector: 0, rich: 0, combo: 0 },
    state: 'menu',
    lastTime: 0,

    init() {
        this.bind();
        this.renderTech();
        this.renderAch();
        this.updateUI();
        this.resize();
        window.onresize = () => this.resize();
        this.loop();
    },

    bind() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(t => t.onclick = () => {
            if (this.state !== 'menu') return;
            audio.init();
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(bt => bt.classList.remove('active'));
            const target = t.dataset.target;
            document.getElementById('screen-' + target).classList.add('active');
            t.classList.add('active');
            switchScreenMesh(target);
            audio.play(500, 'sine', 0.1);
        });

        // Start buttons
        document.querySelectorAll('.start-btn').forEach(b => b.onclick = () => {
            if (!b.disabled && this.state === 'menu') this.startGame(b.dataset.world);
        });

        // Sound toggles
        document.querySelectorAll('.sfx-toggle').forEach(b => b.onclick = () => {
            audio.sfx = !audio.sfx;
            const on = audio.sfx;
            const icon = document.getElementById('sfx-icon');
            const status = document.getElementById('sfx-status');
            if (icon) icon.innerText = on ? '🔊' : '🔇';
            if (status) status.innerText = on ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО';
            document.querySelectorAll('.sfx-toggle .status').forEach(s => s.innerText = on ? 'ВКЛ' : 'ВЫКЛ');
            if (on) audio.play(700, 'sine', 0.1);
        });

        // Music toggles
        document.querySelectorAll('.music-toggle').forEach(b => b.onclick = () => {
            audio.music = !audio.music;
            const on = audio.music;
            const icon = document.getElementById('music-icon');
            const status = document.getElementById('music-status');
            if (icon) icon.innerText = on ? '🎵' : '🚫';
            if (status) status.innerText = on ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО';
            if (on) audio.startMusic(); else audio.stopMusic();
        });

        // Reset progress
        document.getElementById('btn-reset-progress').onclick = () => {
            if (confirm("⚠️ Сбросить ВЕСЬ прогресс? Это действие нельзя отменить!")) {
                localStorage.clear();
                this.scrap = 0;
                this.displayScrap = 0;
                this.best = 0;
                this.totalLvl = 1;
                this.worldLvls = { abyss: 1, micro: 1, space: 1 };
                this.tech = { radius: 0, suction: 0, rare: 0, combo: 0, shield: 0 };
                this.ach = { collector: 0, rich: 0, combo: 0 };
                this.renderTech();
                this.renderAch();
                this.updateUI();
                audio.play(500, 'sine', 0.2);
                alert("✅ Прогресс сброшен!");
            }
        };

        // Pause / Resume / Quit
        document.getElementById('btn-pause-game').onclick = () => {
            if (this.state === 'game') { this.state = 'paused'; this.showModal('pause-modal'); }
        };
        document.getElementById('btn-resume').onclick = () => {
            this.state = 'game'; this.hideModal('pause-modal');
        };
        document.getElementById('btn-quit').onclick = () => {
            this.hideModal('pause-modal'); this.returnToMenu();
        };

        // AD button
        document.getElementById('btn-ad-global').onclick = () => {
            if (window.gpAds) {
                window.gpAds.showRewarded(() => { this.scrap += 500; this.save(); audio.play(1000, 'sine', 0.3, 0.3); });
            } else {
                if (confirm("🎁 Посмотреть рекламу за 500 монет?")) {
                    this.scrap += 500; this.save(); audio.play(1000, 'sine', 0.3, 0.3);
                }
            }
        };

        // Double reward
        document.getElementById('btn-double').onclick = () => {
            if (window.gpAds) {
                window.gpAds.showRewarded(() => {
                    game.sessionScrap *= 2;
                    document.getElementById('win-scrap-total').innerText = game.sessionScrap;
                    document.getElementById('btn-double').style.display = 'none';
                    audio.play(1200, 'sine', 0.3, 0.3);
                });
            } else {
                game.sessionScrap *= 2;
                document.getElementById('win-scrap-total').innerText = game.sessionScrap;
                document.getElementById('btn-double').style.display = 'none';
                audio.play(1200, 'sine', 0.3, 0.3);
            }
        };

        // Finish game
        document.getElementById('btn-finish').onclick = () => {
            this.scrap += game.sessionScrap;
            if (game.sessionScrap > this.best) this.best = game.sessionScrap;
            this.totalLvl++;
            this.worldLvls[game.worldKey] = (this.worldLvls[game.worldKey] || 0) + 1;
            this.ach.collector += game.xp;
            if (this.scrap > this.ach.rich) this.ach.rich = this.scrap;
            if (game.combo > this.ach.combo) this.ach.combo = game.combo;
            this.save();
            this.hideModal('win-modal');
            setTimeout(() => this.returnToMenu(), 300);
        };

        // ESC key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (this.state === 'game') { this.state = 'paused'; this.showModal('pause-modal'); }
                else if (this.state === 'paused') { this.state = 'game'; this.hideModal('pause-modal'); }
            }
        });
    },

    // ─── Modal Helpers ───────────────────────────────────────
    showModal(id) {
        const el = document.getElementById(id);
        el.classList.remove('hide');
        el.classList.add('show');
        el.style.display = 'flex';
    },

    hideModal(id) {
        const el = document.getElementById(id);
        el.classList.add('hide');
        setTimeout(() => {
            el.classList.remove('show', 'hide');
            el.style.display = 'none';
        }, 250);
    },

    // ─── Tech Tree ───────────────────────────────────────────
    renderTech() {
        const container = document.getElementById('tech-tree-content');
        container.innerHTML = '';
        const data = [
            { b: '⚡ СИСТЕМА ЗАХВАТА', cls: 'btn-play', nodes: [
                { id: 'radius', n: 'Магнит', d: 'Радиус действия', c: 500, m: 5 },
                { id: 'suction', n: 'Ротор', d: 'Тяга пылесоса', c: 800, m: 5, dep: 'radius' }
            ]},
            { b: '💰 ЭКОНОМИКА', cls: 'btn-play', nodes: [
                { id: 'rare', n: 'Датчик', d: 'Золотые предметы', c: 1000, m: 3 },
                { id: 'combo', n: 'Мастер Комбо', d: 'Длительность X2', c: 1500, m: 3, dep: 'rare' }
            ]},
            { b: '🛡️ ВЫЖИВАНИЕ', cls: 'btn-survival', nodes: [
                { id: 'shield', n: 'Щит от токсинов', d: 'Снижение штрафа ☣️', c: 1200, m: 5, deps: ['suction', 'combo'] }
            ]}
        ];

        data.forEach(branch => {
            const bDiv = document.createElement('div');
            bDiv.style.width = '100%';
            bDiv.innerHTML = `<div style="font-size:13px; color:var(--primary); margin:25px 0 10px 10px; font-weight:900; letter-spacing:2px;">${branch.b}</div>`;

            branch.nodes.forEach(t => {
                const lvl = this.tech[t.id] || 0;
                const cost = t.c * (lvl + 1);
                let locked = false;
                if (t.deps) locked = t.deps.some(d => (this.tech[d] || 0) < 1);
                else if (t.dep) locked = (this.tech[t.dep] || 0) < 1;

                const div = document.createElement('div');
                div.className = `item-card ${locked ? 'locked' : ''}`;
                div.innerHTML = `<div style="flex:1;"><b style="color:#fff; font-size:18px;">${t.n}</b><br><small style="color:var(--text-dim)">Уровень ${lvl}/${t.m} — ${t.d}</small></div>
                    <button class="btn ${branch.cls}" style="min-width:110px; padding:12px;" onclick="app.buyTech('${t.id}',${cost},${t.m})" ${lvl >= t.m || locked ? 'disabled' : ''}>${lvl >= t.m ? 'MAX' : '🪙 ' + cost}</button>`;
                bDiv.appendChild(div);
            });
            container.appendChild(bDiv);
        });
    },

    buyTech(id, cost, max) {
        if (this.scrap >= cost && (this.tech[id] || 0) < max) {
            this.scrap -= cost;
            this.tech[id] = (this.tech[id] || 0) + 1;
            this.save();
            this.renderTech();
            audio.play(800, 'sine', 0.2);
        }
    },

    // ─── Achievements ────────────────────────────────────────
    renderAch() {
        const c = document.getElementById('ach-list');
        c.innerHTML = '';
        const data = [
            { id: 'collector', n: '🧹 Чистильщик', d: 'Соберите 100 предметов', g: 100, r: 1000 },
            { id: 'rich', n: '💰 Магнат', d: 'Накопите 5000 монет', g: 5000, r: 2000 },
            { id: 'combo', n: '🔥 Мастер комбо', d: 'Сделайте X3 комбо', g: 3, r: 1500 }
        ];
        data.forEach(a => {
            const raw = this.ach[a.id] || 0;
            const done = raw >= a.g;
            const div = document.createElement('div');
            div.className = 'item-card';
            div.style.opacity = done ? 1 : 0.4;
            div.innerHTML = `<div><b style="font-size:20px;">${a.n} ${done ? '✅' : ''}</b><br><small style="color:var(--text-dim)">${a.d}</small></div><b style="color:var(--accent); font-size:18px;">${done ? 'OK' : a.r + '🪙'}</b>`;
            c.appendChild(div);
        });
    },

    // ─── UI Sync ─────────────────────────────────────────────
    updateUI() {
        document.getElementById('best-score-ui').innerText = this.best;
        document.getElementById('total-lvl-ui').innerText = this.totalLvl;

        for (const w in this.worldLvls) {
            const el = document.getElementById('tag-lvl-' + w);
            if (el) el.innerText = this.worldLvls[w];
            const card = document.getElementById('card-' + w);
            if (!card) continue;
            if ((w === 'micro' && this.totalLvl < 3) || (w === 'space' && this.totalLvl < 7)) {
                card.classList.add('locked');
            } else {
                card.classList.remove('locked');
                const btn = card.querySelector('.start-btn');
                if (btn) btn.disabled = false;
            }
        }

        // Settings panel sync
        const sfxIcon = document.getElementById('sfx-icon');
        const sfxStatus = document.getElementById('sfx-status');
        const musIcon = document.getElementById('music-icon');
        const musStatus = document.getElementById('music-status');
        if (sfxIcon) sfxIcon.innerText = audio.sfx ? '🔊' : '🔇';
        if (sfxStatus) sfxStatus.innerText = audio.sfx ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО';
        if (musIcon) musIcon.innerText = audio.music ? '🎵' : '🚫';
        if (musStatus) musStatus.innerText = audio.music ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО';
        document.querySelectorAll('.sfx-toggle .status').forEach(s => s.innerText = audio.sfx ? 'ВКЛ' : 'ВЫКЛ');
    },

    save() {
        localStorage.setItem('tf_v15_scrap', this.scrap);
        localStorage.setItem('tf_v15_best', this.best);
        localStorage.setItem('tf_v15_total', this.totalLvl);
        localStorage.setItem('tf_v15_wlvls', JSON.stringify(this.worldLvls));
        localStorage.setItem('tf_v15_tech', JSON.stringify(this.tech));
        localStorage.setItem('tf_v15_ach', JSON.stringify(this.ach));
        this.updateUI();
    },

    // ─── Menu / Game Transitions ─────────────────────────────
    returnToMenu() {
        this.state = 'menu';
        canvas.style.display = 'none';
        vInd.style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('nav-outer').style.display = 'flex';
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('screen-worlds').classList.add('active');

        document.querySelectorAll('.nav-tab').forEach(bt => bt.classList.remove('active'));
        document.querySelector('.nav-tab[data-target="worlds"]').classList.add('active');

        switchScreenMesh('worlds');
        audio.stopMusic();
        game.items = [];
        game.particles = [];
        this.renderTech();
        this.renderAch();
        this.updateUI();
    },

    startGame(wK) {
        game.prepare(wK);
        this.state = 'game';
        canvas.style.display = 'block';
        vInd.style.display = 'block';
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('nav-outer').style.display = 'none';
        document.getElementById('main-header').classList.add('hidden');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        audio.init();
        audio.startMusic();
    },

    resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    },

    // ─── Main Loop ───────────────────────────────────────────
    loop(ts) {
        if (ts - this.lastTime < 14) {
            requestAnimationFrame(t => this.loop(t));
            return;
        }
        this.lastTime = ts;

        // Animated scrap counter
        if (this.displayScrap < this.scrap) this.displayScrap = Math.min(this.scrap, this.displayScrap + 1000);
        if (this.displayScrap > this.scrap) this.displayScrap = Math.max(this.scrap, this.displayScrap - 1000);
        document.getElementById('global-scrap').innerText = Math.floor(this.displayScrap);

        if (this.state === 'game' || this.state === 'paused') {
            if (this.state === 'game') game.update();
            game.render();
        }
        requestAnimationFrame(t => this.loop(t));
    }
};