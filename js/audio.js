// ─── Audio Engine ─────────────────────────────────────────────────
const audio = {
    ctx: null, sfx: true, music: true, musGain: null, musPlaying: false, musNodes: [],

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    play(freq, type, duration, volume = 0.1) {
        if (!this.sfx || !this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* ignore */ }
    },

    startMusic() {
        if (!this.music || !this.ctx || this.musPlaying) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(55, this.ctx.currentTime);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1);
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(12, this.ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            lfo.start();
            this.musNodes = [osc, lfo, gain, lfoGain];
            this.musGain = gain;
            this.musPlaying = true;
        } catch (e) { /* ignore */ }
    },

    stopMusic() {
        if (!this.musNodes.length || !this.musPlaying) return;
        try {
            this.musGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            setTimeout(() => {
                this.musNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch (_e) {} });
                this.musPlaying = false;
                this.musNodes = [];
            }, 600);
        } catch (e) { /* ignore */ }
    }
};