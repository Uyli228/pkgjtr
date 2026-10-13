/* Чотири Кути — рушій: розкладка 1–4 гравців, мультитач-кнопки, боти, звук, фази гри. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const TAU = Math.PI * 2;

  // ---------- утиліти ----------
  const U = (G.U = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    angDiff(a, b) {
      let d = (b - a) % TAU;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      return d;
    },
    gauss() {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    },
    // детермінований генератор (однакові траси для всіх гравців)
    rng(seed) {
      let a = seed >>> 0;
      const f = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      f.range = (lo, hi) => lo + f() * (hi - lo);
      f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
      f.pick = (arr) => arr[Math.floor(f() * arr.length)];
      return f;
    },
    outBack(t) {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    rr(g, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    },
    shade(hex, amt) {
      // amt -1..1: темніше/світліше
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
      const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
      r = Math.round((t - r) * p + r);
      gg = Math.round((t - gg) * p + gg);
      b = Math.round((t - b) * p + b);
      return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
    },
    alpha(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    },
  });

  // ---------- кольори гравців ----------
  G.COLORS = [
    { key: 'red', name: 'Червоний', c: '#FF5468', d: '#B92A44', l: '#FFB0BA' },
    { key: 'blue', name: 'Синій', c: '#3AA8FF', d: '#1F69B8', l: '#B3DBFF' },
    { key: 'green', name: 'Зелений', c: '#35D486', d: '#1C8E57', l: '#ADF0CD' },
    { key: 'yellow', name: 'Жовтий', c: '#FFC530', d: '#B98500', l: '#FFE7A3' },
  ];
  G.FONT_D = 'Unbounded, "Arial Black", "Segoe UI", sans-serif';
  G.FONT_B = 'Manrope, "Segoe UI", Roboto, Arial, sans-serif';

  // ---------- сховище й налаштування ----------
  G.store = {
    get(k, def) {
      try {
        const v = localStorage.getItem('ck_' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('ck_' + k, JSON.stringify(v));
      } catch (e) { /* приватний режим — ігноруємо */ }
    },
  };
  G.settings = Object.assign({ sound: true, vibe: true, bot: 1 }, G.store.get('settings', {}));
  G.saveSettings = () => G.store.set('settings', G.settings);

  // ---------- звук (синтез WebAudio, без файлів) ----------
  const A = (G.audio = {
    ctx: null,
    master: null,
    noiseBuf: null,
    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.6;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) {
        this.ctx = null;
      }
    },
    tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
      if (!G.settings.sound || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.03);
    },
    noise(dur, vol = 0.25, freq = 1200, delay = 0, type = 'lowpass') {
      if (!G.settings.sound || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + dur + 0.03);
    },
    play(name, p = 0) {
      if (!G.settings.sound || !this.ctx) return;
      const T = this.tone.bind(this), N = this.noise.bind(this);
      switch (name) {
        case 'ui': T(660, 0.06, 'triangle', 0.12); break;
        case 'tap': T(420 + p * 60, 0.05, 'square', 0.06); break;
        case 'ready': T(520, 0.07, 'triangle', 0.14); T(780, 0.09, 'triangle', 0.12, 0, 0.06); break;
        case 'count': T(440, 0.12, 'square', 0.1); break;
        case 'go': T(880, 0.22, 'square', 0.12); T(1320, 0.18, 'triangle', 0.08, 0, 0.05); break;
        case 'point': T(700, 0.08, 'square', 0.1); T(1050, 0.12, 'square', 0.1, 0, 0.07); break;
        case 'coin': T(988, 0.06, 'square', 0.08); T(1319, 0.14, 'square', 0.08, 0, 0.05); break;
        case 'bad': T(200, 0.22, 'sawtooth', 0.12, -90); break;
        case 'out': T(330, 0.35, 'sawtooth', 0.12, -250); N(0.3, 0.12, 600); break;
        case 'boom': N(0.6, 0.5, 500); T(90, 0.5, 'sine', 0.35, -50); break;
        case 'pop': N(0.12, 0.35, 3000, 0, 'highpass'); T(300, 0.08, 'square', 0.12, -200); break;
        case 'whoosh': N(0.18, 0.12, 1800, 0, 'bandpass'); break;
        case 'thud': T(120, 0.12, 'sine', 0.3, -60); N(0.08, 0.15, 400); break;
        case 'jump': T(300, 0.14, 'square', 0.07, 400); break;
        case 'hit': N(0.1, 0.25, 2500, 0, 'bandpass'); T(180, 0.08, 'square', 0.1, -80); break;
        case 'stick': T(900, 0.05, 'square', 0.08); N(0.06, 0.2, 4000, 0, 'highpass'); break;
        case 'beep': T(1200, 0.05, 'square', 0.08); break;
        case 'kick': T(140, 0.16, 'sine', 0.4, -100); break;
        case 'hat': N(0.04, 0.08, 8000, 0, 'highpass'); break;
        case 'note': T(p, 0.18, 'triangle', 0.16); break;
        case 'win':
          [523, 659, 784, 1047].forEach((f, i) => T(f, 0.2, 'square', 0.1, 0, i * 0.09));
          T(1047, 0.45, 'triangle', 0.12, 0, 0.36);
          break;
        case 'fanfare':
          [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => T(f, 0.22, 'square', 0.1, 0, i * 0.11));
          break;
        case 'draw': T(400, 0.2, 'triangle', 0.12); T(300, 0.3, 'triangle', 0.12, 0, 0.15); break;
        case 'meow': T(700, 0.25, 'triangle', 0.14, -300); break;
        case 'alarm': T(880, 0.1, 'square', 0.1); T(660, 0.1, 'square', 0.1, 0, 0.11); break;
        case 'pump': N(0.12, 0.15, 900, 0, 'bandpass'); T(200 + p * 500, 0.08, 'sine', 0.08); break;
        case 'train': T(330, 0.4, 'sawtooth', 0.08); T(392, 0.4, 'sawtooth', 0.08); break;
      }
    },
  });
  G.sfx = (n, p) => A.play(n, p);
  G.vibe = (ms) => {
    if (!G.settings.vibe) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* недоступно */ }
  };

  // ---------- кешовані емодзі для canvas ----------
  const emojiCache = new Map();
  function emojiSprite(ch, size) {
    const s = Math.max(8, Math.round(size / 4) * 4);
    const key = ch + '|' + s;
    let c = emojiCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    const pad = Math.ceil(s * 0.25);
    c.width = c.height = s + pad * 2;
    const g = c.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.fillText(ch, c.width / 2, c.height / 2 + s * 0.06);
    emojiCache.set(key, c);
    return c;
  }

  // ---------- рушій ----------
  const E = (G.E = {
    canvas: null, g: null, W: 0, H: 0, dpr: 1, ox: 0,
    players: [], n: 0, phase: 'off', paused: false,
    def: null, inst: null, t: 0, phaseT: 0, playT: 0,
    down: [false, false, false, false],
    ready: [false, false, false, false],
    out: [false, false, false, false],
    timers: [], parts: [], floats: [], shakeMag: 0,
    winners: null, resultNote: '', onEnd: null, skill: 0.6,
  });

  E.init = function (canvas) {
    E.canvas = canvas;
    E.g = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    bindInput();
    requestAnimationFrame(frame);
  };

  function resize() {
    const par = E.canvas.parentElement, cs = getComputedStyle(par);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    // поля під виріз камери / закруглення екрана
    const vw = par.clientWidth - padL - padR;
    const vh = par.clientHeight;
    // гра горизонтальна: полотно на всю ширину телефона, гравці — з довгих боків
    const W = vw;
    E.W = W;
    E.H = vh;
    E.ox = Math.round(padL + (vw - W) / 2);
    E.dpr = Math.min(2, window.devicePixelRatio || 1);
    E.canvas.style.width = W + 'px';
    E.canvas.style.height = vh + 'px';
    E.canvas.style.left = E.ox + 'px';
    E.canvas.width = Math.round(W * E.dpr);
    E.canvas.height = Math.round(vh * E.dpr);
    layout();
    if (E.inst && E.inst.resize) E.inst.resize();
  }

  function layout() {
    const W = E.W, H = E.H;
    // кнопки пропорційні висоті екрана, щоб влазити і на низьких телефонах (ландшафт)
    const bh = Math.round(U.clamp(H * 0.15, 40, 92));
    E.bh = bh;
    const ar = (E.arena = { x: 0, y: bh, w: W, h: H - 2 * bh });
    ar.cx = ar.x + ar.w / 2;
    ar.cy = ar.y + ar.h / 2;
    ar.u = Math.min(ar.w, ar.h) / 100;
    const P = Math.PI;
    const four = E.n >= 3;
    const hh = ar.h / 2;
    E.seats = four
      ? [
          { btn: { x: 0, y: H - bh, w: W / 2, h: bh }, rot: 0, ax: ar.x, ay: ar.y + ar.h, panel: { x: 0, y: ar.cy, w: W / 2, h: hh } },
          { btn: { x: W / 2, y: 0, w: W / 2, h: bh }, rot: P, ax: ar.x + ar.w, ay: ar.y, panel: { x: W / 2, y: ar.y, w: W / 2, h: hh } },
          { btn: { x: 0, y: 0, w: W / 2, h: bh }, rot: P, ax: ar.x, ay: ar.y, panel: { x: 0, y: ar.y, w: W / 2, h: hh } },
          { btn: { x: W / 2, y: H - bh, w: W / 2, h: bh }, rot: 0, ax: ar.x + ar.w, ay: ar.y + ar.h, panel: { x: W / 2, y: ar.cy, w: W / 2, h: hh } },
        ]
      : [
          { btn: { x: 0, y: H - bh, w: W, h: bh }, rot: 0, ax: ar.cx, ay: ar.y + ar.h, panel: { x: 0, y: ar.cy, w: W, h: hh } },
          { btn: { x: 0, y: 0, w: W, h: bh }, rot: P, ax: ar.cx, ay: ar.y, panel: { x: 0, y: ar.y, w: W, h: hh } },
        ];
    E.seats.forEach((s, i) => {
      s.index = i;
      s.ang = Math.atan2(ar.cy - s.ay, ar.cx - s.ax);
      s.corner = four;
      s.panel.rot = s.rot;
    });
    E.players.forEach((p) => Object.assign(p, seatProps(E.seats[p.seat])));
  }
  function seatProps(s) {
    return { btn: s.btn, rot: s.rot, ax: s.ax, ay: s.ay, ang: s.ang, panel: s.panel, corner: s.corner };
  }

  // точка всередині арени від «кута» гравця в бік центру
  // у кутах відступаємо однаково від обох країв, щоб нічого не обрізалось
  E.home = (p, inset) => {
    if (p.corner) {
      const sx = p.ax < E.arena.cx ? 1 : -1, sy = p.ay < E.arena.cy ? 1 : -1;
      return { x: p.ax + sx * inset, y: p.ay + sy * inset };
    }
    return { x: p.ax + Math.cos(p.ang) * inset, y: p.ay + Math.sin(p.ang) * inset };
  };
  // діапазон кутів «всередину арени» від місця гравця
  E.fan = (p, margin = 0.12) => {
    if (p.corner) {
      const sx = p.ax < E.arena.cx ? 1 : -1, sy = p.ay < E.arena.cy ? 1 : -1;
      const a0 = Math.atan2(0, sx), a1 = Math.atan2(sy, 0);
      let lo = a0, hi = a1;
      if (U.angDiff(lo, hi) < 0) [lo, hi] = [hi, lo];
      const span = U.angDiff(lo, hi);
      return { lo: lo + margin, span: span - margin * 2 };
    }
    return { lo: p.ang - Math.PI / 2 + margin, span: Math.PI - margin * 2 };
  };

  E.setPlayers = function (slots) {
    E.players = [];
    slots.forEach((type, id) => {
      if (type === 'off') return;
      E.players.push({ id, color: G.COLORS[id], bot: type === 'bot', seat: 0, name: G.COLORS[id].name });
    });
    E.n = E.players.length;
    E.players.forEach((p, i) => (p.seat = i));
    layout();
    E.needDual = E.players.some((p) => p.rot && !p.bot);
  };

  E.byId = (id) => E.players.find((p) => p.id === id);
  E.alive = () => E.players.filter((p) => !E.out[p.id]);
  E.humans = () => E.players.filter((p) => !p.bot);

  // ---------- запуск гри ----------
  E.start = function (def, onEnd) {
    E.def = def;
    E.onEnd = onEnd;
    E.skill = [0.3, 0.62, 0.92][G.settings.bot] ?? 0.62;
    E.down = [false, false, false, false];
    E.stick = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, on: false, ox: 0, oy: 0 }));
    E.ready = [false, false, false, false];
    E.out = [false, false, false, false];
    E.timers = [];
    E.parts = [];
    E.floats = [];
    E.winners = null;
    E.resultNote = '';
    E.paused = false;
    E.t = 0;
    E.playT = 0;
    E.shakeMag = 0;
    pointers.clear();
    layout();
    E.inst = def.create(E);
    if (E.inst.init) E.inst.init();
    setPhase('intro');
    E.players.forEach((p) => {
      if (p.bot) E.after(U.rand(0.4, 1.1), () => markReady(p.id), true);
    });
  };
  E.stop = function () {
    setPhase('off');
    E.inst = null;
    E.def = null;
    pointers.clear();
  };

  function setPhase(ph) {
    E.phase = ph;
    E.phaseT = 0;
    if (G.onPhase) G.onPhase(ph);
  }

  function markReady(id) {
    if (E.phase !== 'intro' || E.ready[id]) return;
    E.ready[id] = true;
    G.sfx('ready');
    if (E.players.every((p) => E.ready[p.id])) {
      setPhase('count');
      G.sfx('count');
    }
  }

  // таймери (ігровий час, зупиняються на паузі)
  E.after = function (sec, fn, anyPhase) {
    E.timers.push({ t: sec, fn, any: !!anyPhase });
  };

  E.finish = function (winnerIds, note) {
    if (E.phase !== 'play') return;
    E.winners = winnerIds.slice();
    E.resultNote = note || '';
    setPhase('result');
    E.players.forEach((p) => (E.down[p.id] = false));
    pointers.clear();
    E.hitstop(0.12);
    if (E.winners.length && E.winners.length < E.n) {
      E.flash('#FFFFFF', 0.6);
      G.sfx('win');
      G.vibe([40, 60, 80]);
      const ar = E.arena;
      for (const id of E.winners) {
        const p = E.byId(id);
        E.burst(ar.cx, ar.cy, p.color.c, 60, 1.3);
      }
    } else G.sfx('draw');
  };
  // переможці з найкращим значенням (best: 'max' або 'min'), ігнорує null
  E.best = function (vals, mode = 'max', eps = 1e-9) {
    let bestV = null;
    for (const p of E.players) {
      const v = vals[p.id];
      if (v == null || !isFinite(v)) continue;
      if (bestV == null || (mode === 'max' ? v > bestV + eps : v < bestV - eps)) bestV = v;
    }
    if (bestV == null) return [];
    return E.players.filter((p) => vals[p.id] != null && Math.abs(vals[p.id] - bestV) <= eps).map((p) => p.id);
  };

  E.eliminate = function (id) {
    if (E.out[id]) return;
    E.out[id] = true;
    E.down[id] = false;
    G.sfx('out');
    G.vibe(120);
    E.flash('#FF5468', 0.8);
    E.hitstop(0.09);
  };
  // якщо лишився один — він перемагає. Повертає true, якщо гру завершено.
  E.lastStanding = function (fallbackIds) {
    const al = E.alive();
    if (al.length === 1 && E.n > 1) {
      E.finish([al[0].id]);
      return true;
    }
    if (al.length === 0) {
      E.finish(fallbackIds || []);
      return true;
    }
    return false;
  };

  // ---------- ввід ----------
  E.press = function (id) {
    if (E.down[id]) return;
    E.down[id] = true;
    if (E.phase === 'intro') return markReady(id);
    if (E.phase === 'play' && !E.out[id]) {
      G.vibe(12);
      if (E.inst && E.inst.press) E.inst.press(E.byId(id));
    }
  };
  E.release = function (id) {
    if (!E.down[id]) return;
    E.down[id] = false;
    if (E.phase === 'play' && !E.out[id] && E.inst && E.inst.release) E.inst.release(E.byId(id));
  };
  // для ботів
  E.tap = function (id) {
    if (E.down[id]) E.release(id);
    E.press(id);
    E.after(0.06, () => E.release(id));
  };
  E.hold = function (id, on) {
    if (on) E.press(id);
    else E.release(id);
  };

  const pointers = new Map(); // pointerId -> { id, ox, oy }
  E.stick = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, on: false, ox: 0, oy: 0 }));
  E.stickR = () => Math.min(E.bh * 0.42, 46);
  // джойстик для ботів (і клавіатури): вектор довжиною ≤ 1
  E.setStick = function (id, x, y) {
    const l = Math.hypot(x, y);
    const k = l > 1 ? 1 / l : 1;
    const st = E.stick[id];
    st.x = x * k;
    st.y = y * k;
    st.on = l > 0.05;
  };
  const isStick = () => E.def && E.def.input === 'stick';
  function playerAt(x, y) {
    for (const p of E.players) {
      const b = p.btn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return p;
    }
    return null;
  }
  function bindInput() {
    const c = E.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      G.audio.init();
      if (E.phase === 'off' || E.paused) return;
      const [x, y] = pos(e);
      if (E.phase === 'result') {
        if (E.phaseT > 1.1) continueAfterResult();
        return;
      }
      const p = playerAt(x, y);
      if (!p || p.bot) return;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      pointers.set(e.pointerId, { id: p.id, ox: x, oy: y });
      if (isStick()) {
        const st = E.stick[p.id];
        st.ox = x;
        st.oy = y;
        st.x = st.y = 0;
        st.on = true;
      }
      E.press(p.id);
    });
    c.addEventListener('pointermove', (e) => {
      const pt = pointers.get(e.pointerId);
      if (!pt || !isStick()) return;
      const [x, y] = pos(e);
      const R = E.stickR();
      E.setStick(pt.id, (x - pt.ox) / R, (y - pt.oy) / R);
      E.stick[pt.id].on = true;
    });
    const up = (e) => {
      const pt = pointers.get(e.pointerId);
      if (pt === undefined) return;
      const id = pt.id;
      pointers.delete(e.pointerId);
      for (const v of pointers.values()) if (v.id === id) return;
      const st = E.stick[id];
      st.x = st.y = st.ox = st.oy = 0;
      st.on = false;
      E.release(id);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    // клавіатура для комп'ютера: 1-й A, 2-й L, 3-й Q, 4-й P (або цифри 1–4)
    const KEYS = { KeyA: 0, Digit1: 0, KeyL: 1, Digit2: 1, KeyQ: 2, Digit3: 2, KeyP: 3, Digit4: 3 };
    const held = new Set();
    const DIRS = { KeyW: [0, 0, -1], KeyS: [0, 0, 1], KeyD: [0, 1, 0], ArrowUp: [1, 0, -1], ArrowDown: [1, 0, 1], ArrowLeft: [1, -1, 0], ArrowRight: [1, 1, 0] };
    const keyStick = () => {
      for (const id of [0, 1]) {
        let x = 0, y = 0;
        for (const [k, d] of Object.entries(DIRS)) if (held.has(k) && d[0] === id) { x += d[1]; y += d[2]; }
        if (id === 0 && held.has('KeyA') && isStick()) x -= 1;
        const p = E.byId(id);
        if (p && !p.bot && isStick() && !E.stick[id].ox) E.setStick(id, x, y);
      }
    };
    window.addEventListener('keydown', (e) => {
      held.add(e.code);
      if (DIRS[e.code] || e.code === 'KeyA') keyStick();
      if (E.phase === 'off' || E.paused || e.repeat) return;
      G.audio.init();
      if (E.phase === 'result' && (e.code === 'Space' || e.code === 'Enter' || KEYS[e.code] !== undefined)) {
        if (E.phaseT > 1.1) continueAfterResult();
        return;
      }
      const id = KEYS[e.code];
      if (id === undefined) return;
      const p = E.byId(id);
      if (p && !p.bot) E.press(id);
    });
    window.addEventListener('keyup', (e) => {
      held.delete(e.code);
      if (DIRS[e.code] || e.code === 'KeyA') keyStick();
      const id = KEYS[e.code];
      if (id === undefined || E.phase === 'off') return;
      const p = E.byId(id);
      if (p && !p.bot) E.release(id);
    });
  }

  function continueAfterResult() {
    if (E.phase !== 'result') return;
    const w = E.winners, cb = E.onEnd;
    G.sfx('ui');
    setPhase('done');
    if (cb) cb(w);
  }
  E.continueAfterResult = continueAfterResult;

  // ---------- частинки й ефекти ----------
  E.burst = function (x, y, color, count = 20, speed = 1) {
    const u = E.arena.u;
    if (E.reduced) count = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, s = (20 + Math.random() * 60) * u * speed;
      E.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10 * u,
        life: 0.6 + Math.random() * 0.8, t: 0, color: Array.isArray(color) ? U.pick(color) : color,
        size: (0.8 + Math.random() * 1.6) * u, rot: Math.random() * TAU, vr: U.rand(-8, 8), sq: Math.random() < 0.6,
      });
    }
    if (E.parts.length > 600) E.parts.splice(0, E.parts.length - 600);
  };
  E.float = function (x, y, text, color = '#fff', rot = 0, size) {
    const ar = E.arena;
    x = U.clamp(x, ar.x + 16 * ar.u, ar.x + ar.w - 16 * ar.u);
    E.floats.push({ x, y, text, color, rot, t: 0, life: 1.1, size: size || 5 * E.arena.u });
  };
  E.reduced = (() => {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  })();
  E.shake = function (m) {
    E.shakeMag = Math.max(E.shakeMag, E.reduced ? m * 0.4 : m);
  };
  // «стоп-кадр» на важливій події (60–120 мс)
  E.hitT = 0;
  E.hitstop = function (sec = 0.08) {
    E.hitT = Math.max(E.hitT, sec);
  };
  // спалах усієї арени
  E.flashT = 0;
  E.flashC = '#FFFFFF';
  E.flash = function (color = '#FFFFFF', k = 1) {
    E.flashC = color;
    E.flashT = Math.max(E.flashT, 0.35 * k);
  };

  // ---------- персонаж гравця ----------
  // Кругленький колобок у кольорі гравця з емоцією: idle | happy | scared | hurt | out | sly
  E.avatar = function (g, x, y, r, p, mood = 'idle', rot = 0) {
    const col = p.color || p;
    const t = E.t + (p.seat || 0) * 0.7;
    let sx = 1, sy = 1, dy = 0;
    if (mood === 'happy') {
      const j = Math.abs(Math.sin(t * 9));
      dy = -j * r * 0.35;
      sy = 1 + j * 0.08;
      sx = 1 - j * 0.05;
    } else if (mood === 'scared') {
      x += Math.sin(t * 60) * r * 0.05;
    } else if (mood === 'idle') {
      const b = Math.sin(t * 3) * 0.04;
      sy = 1 + b;
      sx = 1 - b;
    } else if (mood === 'hurt') {
      sy = 0.88;
      sx = 1.1;
    }
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.translate(0, dy);
    g.scale(sx, sy);
    const out = mood === 'out';
    // тінь
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.ellipse(0, r * 0.95 - dy / sy, r * 0.8, r * 0.2, 0, 0, TAU);
    g.fill();
    // тіло
    g.fillStyle = out ? '#4A4468' : col.d;
    g.beginPath();
    g.arc(0, r * 0.08, r, 0, TAU);
    g.fill();
    g.fillStyle = out ? '#6B6489' : col.c;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.beginPath();
    g.ellipse(-r * 0.38, -r * 0.45, r * 0.28, r * 0.18, -0.5, 0, TAU);
    g.fill();
    // очі
    const ex = r * 0.34, ey = -r * 0.12, er = r * 0.24;
    g.lineCap = 'round';
    g.strokeStyle = '#1A1233';
    g.lineWidth = Math.max(1.5, r * 0.11);
    for (const s of [-1, 1]) {
      if (out || mood === 'hurt') {
        g.beginPath();
        g.moveTo(s * ex - er * 0.6, ey - er * 0.6);
        g.lineTo(s * ex + er * 0.6, ey + er * 0.6);
        g.moveTo(s * ex + er * 0.6, ey - er * 0.6);
        g.lineTo(s * ex - er * 0.6, ey + er * 0.6);
        g.stroke();
      } else if (mood === 'happy') {
        g.beginPath();
        g.arc(s * ex, ey + er * 0.3, er * 0.75, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      } else {
        const big = mood === 'scared' ? 1.25 : 1;
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(s * ex, ey, er * big, 0, TAU);
        g.fill();
        g.fillStyle = '#1A1233';
        const look = mood === 'sly' ? s * er * 0.3 : 0;
        g.beginPath();
        g.arc(s * ex + look, ey + er * 0.1, er * (mood === 'scared' ? 0.35 : 0.5), 0, TAU);
        g.fill();
        if (mood === 'sly') {
          g.fillStyle = col.c;
          g.fillRect(s * ex - er * 1.3, ey - er * 1.3, er * 2.6, er * 1.1);
        }
      }
    }
    // рот
    g.strokeStyle = '#1A1233';
    g.beginPath();
    if (mood === 'happy') {
      g.fillStyle = '#7A1E2A';
      g.arc(0, r * 0.28, r * 0.3, 0, Math.PI);
      g.fill();
    } else if (mood === 'scared') {
      g.fillStyle = '#1A1233';
      g.ellipse(0, r * 0.42, r * 0.14, r * 0.2, 0, 0, TAU);
      g.fill();
    } else if (mood === 'hurt' || out) {
      g.arc(0, r * 0.55, r * 0.22, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else if (mood === 'sly') {
      g.moveTo(-r * 0.2, r * 0.38);
      g.quadraticCurveTo(r * 0.1, r * 0.48, r * 0.3, r * 0.3);
      g.stroke();
    } else {
      g.arc(0, r * 0.3, r * 0.18, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    g.lineCap = 'butt';
    g.restore();
  };

  // ---------- малювання ----------
  E.txt = function (g, s, x, y, size, color = '#fff', o = {}) {
    g.font = `${o.weight || 800} ${Math.round(size)}px ${o.body ? G.FONT_B : G.FONT_D}`;
    g.textAlign = o.align || 'center';
    g.textBaseline = o.base || 'middle';
    if (o.stroke) {
      g.lineJoin = 'round';
      g.lineWidth = o.strokeW || size * 0.18;
      g.strokeStyle = o.stroke;
      g.strokeText(s, x, y);
    }
    g.fillStyle = color;
    g.fillText(s, x, y);
  };
  E.wrap = function (g, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  E.emoji = function (g, ch, x, y, size, rot = 0) {
    const c = emojiSprite(ch, size);
    const s = (c.width * size) / (Math.max(8, Math.round(size / 4) * 4));
    if (rot) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.drawImage(c, -s / 2, -s / 2, s, s);
      g.restore();
    } else g.drawImage(c, x - s / 2, y - s / 2, s, s);
  };
  // малювання в панелі гравця: локальні координати (0..w, 0..h), «низ» — до гравця
  E.panel = function (g, p, fn) {
    const P = p.panel;
    g.save();
    g.beginPath();
    g.rect(P.x, P.y, P.w, P.h);
    g.clip();
    if (P.rot) {
      g.translate(P.x + P.w, P.y + P.h);
      g.rotate(Math.PI);
    } else g.translate(P.x, P.y);
    fn(P.w, P.h);
    g.restore();
  };
  // повідомлення по центру — для обох сторін столу
  // keep=true: в одиночному режимі все одно зсуваємо вниз (щоб не перекривати об'єкт у центрі)
  E.dual = function (g, fn, gap, keep) {
    const ar = E.arena;
    if (!E.needDual) {
      fn(ar.cx, ar.cy + (keep ? gap : 0));
      return;
    }
    if (gap == null) gap = ar.h * 0.2;
    fn(ar.cx, ar.cy + gap);
    g.save();
    g.translate(ar.cx, ar.cy);
    g.rotate(Math.PI);
    g.translate(-ar.cx, -ar.cy);
    fn(ar.cx, ar.cy + gap);
    g.restore();
  };
  // підпис біля кнопки гравця (на арені), повернутий до нього
  E.hud = function (g, p, text, o = {}) {
    const b = p.btn, u = E.arena.u;
    // на двох гравців об'єкт стоїть по центру краю — підпис зсуваємо праворуч (з точки зору гравця)
    const dx = o.dx != null ? o.dx : p.corner ? 0 : b.w * 0.26;
    const x = b.x + b.w / 2 + dx * (p.rot ? -1 : 1);
    const off = o.off != null ? o.off : 4.2 * u;
    const y = p.rot ? b.y + b.h + off : b.y - off;
    g.save();
    g.translate(x, y);
    if (p.rot) g.rotate(Math.PI);
    const size = o.size || 4.6 * u;
    g.font = `800 ${Math.round(size)}px ${G.FONT_D}`;
    const w = g.measureText(text).width + size * 1.2;
    const h = size * 1.7;
    U.rr(g, -w / 2, -h / 2, w, h, h / 2);
    g.fillStyle = o.bg || 'rgba(10,8,24,0.72)';
    g.fill();
    if (o.ring !== false) {
      g.lineWidth = 2;
      g.strokeStyle = p.color.c;
      g.stroke();
    }
    E.txt(g, text, 0, 1, size, o.color || '#fff');
    g.restore();
  };
  // смуга часу вздовж верхнього й нижнього країв арени
  E.timeBar = function (g, frac, color = '#F6F1FF') {
    const ar = E.arena, h = Math.max(3, ar.u * 1.1);
    frac = U.clamp(frac, 0, 1);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.fillRect(ar.x, ar.y, ar.w, h);
    g.fillRect(ar.x, ar.y + ar.h - h, ar.w, h);
    g.fillStyle = frac < 0.2 ? '#FF5468' : color;
    const w = ar.w * frac;
    g.fillRect(ar.x + (ar.w - w) / 2, ar.y, w, h);
    g.fillRect(ar.x + (ar.w - w) / 2, ar.y + ar.h - h, w, h);
  };
  E.crown = function (g, x, y, s, color) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(-s, s * 0.55);
    g.lineTo(-s, -s * 0.25);
    g.lineTo(-s * 0.5, s * 0.12);
    g.lineTo(0, -s * 0.6);
    g.lineTo(s * 0.5, s * 0.12);
    g.lineTo(s, -s * 0.25);
    g.lineTo(s, s * 0.55);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.lineWidth = s * 0.12;
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.stroke();
    g.fillStyle = '#fff';
    [-s, 0, s].forEach((cx, i) => {
      g.beginPath();
      g.arc(cx, i === 1 ? -s * 0.6 : -s * 0.25, s * 0.16, 0, TAU);
      g.fill();
    });
    g.restore();
  };
  // темна панель вибулого гравця
  E.outPanel = function (g, w, h, label = 'ВИБУВ') {
    g.fillStyle = 'rgba(12,9,26,0.62)';
    g.fillRect(0, 0, w, h);
    E.txt(g, label, w / 2, h / 2, Math.min(w, h) * 0.11, '#fff', { stroke: 'rgba(0,0,0,0.5)' });
  };

  // ---------- цикл ----------
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
    last = ts;
    if (E.phase === 'off') return;
    if (!E.paused) step(dt);
    render();
  }

  function step(dt) {
    E.flashT = Math.max(0, E.flashT - dt);
    if (E.hitT > 0) {
      E.hitT -= dt;
      E.shakeMag = Math.max(0, E.shakeMag - dt * 30);
      return;
    }
    E.t += dt;
    E.phaseT += dt;
    // таймери
    if (E.timers.length) {
      const run = [];
      E.timers = E.timers.filter((tm) => {
        if (E.phase !== 'play' && !tm.any) return true;
        tm.t -= dt;
        if (tm.t <= 0) {
          run.push(tm.fn);
          return false;
        }
        return true;
      });
      run.forEach((fn) => fn());
    }
    if (E.phase === 'count') {
      const k = Math.floor(E.phaseT / 0.75);
      if (k !== E._lastK && k > 0 && k < 3) G.sfx('count');
      E._lastK = k;
      if (E.phaseT >= 2.25) {
        setPhase('play');
        E._lastK = -1;
        G.sfx('go');
        if (E.inst.start) E.inst.start();
      }
    }
    if (E.phase === 'play') {
      E.playT += dt;
      if (E.inst.bot) for (const p of E.players) if (p.bot && !E.out[p.id]) E.inst.bot(p, dt);
      if (E.phase === 'play') E.inst.update(dt);
    } else if (E.phase === 'result' || E.phase === 'done') {
      if (E.inst && E.inst.after) E.inst.after(dt);
      if (E.phase === 'result' && E.phaseT > 0.4 && E.phaseT < 2.6 && Math.random() < 0.25) {
        const ar = E.arena;
        const cols = E.winners.length ? E.winners.map((id) => G.COLORS[id].c) : ['#fff'];
        E.burst(U.rand(ar.x, ar.x + ar.w), ar.y + U.rand(0, ar.h * 0.3), cols, 4, 0.5);
      }
    }
    // частинки
    for (const q of E.parts) {
      q.t += dt;
      q.vy += 90 * E.arena.u * dt;
      q.vx *= 1 - 1.2 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
    E.parts = E.parts.filter((q) => q.t < q.life);
    for (const f of E.floats) f.t += dt;
    E.floats = E.floats.filter((f) => f.t < f.life);
    E.shakeMag = Math.max(0, E.shakeMag - dt * 30);
  }

  function render() {
    const g = E.g, W = E.W, H = E.H, ar = E.arena;
    g.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    g.fillStyle = '#0E0B1F';
    g.fillRect(0, 0, W, H);
    g.save();
    if (E.shakeMag > 0.2) g.translate(U.rand(-1, 1) * E.shakeMag, U.rand(-1, 1) * E.shakeMag);
    // фон арени
    g.fillStyle = (E.def && E.def.bg) || '#1A1536';
    g.fillRect(ar.x, ar.y, ar.w, ar.h);
    if (E.inst && E.inst.draw) E.inst.draw(g);
    // частинки
    for (const q of E.parts) {
      g.globalAlpha = U.clamp(1 - q.t / q.life, 0, 1);
      g.fillStyle = q.color;
      g.save();
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      if (q.sq) g.fillRect(-q.size, -q.size * 0.5, q.size * 2, q.size);
      else {
        g.beginPath();
        g.arc(0, 0, q.size * 0.7, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    g.globalAlpha = 1;
    for (const f of E.floats) {
      const k = f.t / f.life;
      g.globalAlpha = 1 - k * k;
      g.save();
      g.translate(f.x, f.y);
      if (f.rot) g.rotate(f.rot);
      const pop = f.t < 0.15 ? 0.6 + U.outBack(f.t / 0.15) * 0.4 : 1;
      E.txt(g, f.text, 0, -k * 8 * ar.u, f.size * pop * 1.15, f.color, { stroke: 'rgba(0,0,0,0.55)' });
      g.restore();
    }
    g.globalAlpha = 1;
    if (E.flashT > 0) {
      g.globalAlpha = Math.min(0.5, (E.flashT / 0.35) * 0.5);
      g.fillStyle = E.flashC;
      g.fillRect(ar.x, ar.y, ar.w, ar.h);
      g.globalAlpha = 1;
    }
    g.restore();

    if (E.phase === 'intro') drawIntro(g);
    else if (E.phase === 'count') drawCount(g);
    else if (E.phase === 'play' && E.playT < 0.6) drawGo(g);
    else if (E.phase === 'result' || E.phase === 'done') drawResult(g);

    drawButtons(g);
  }

  function drawIntro(g) {
    const ar = E.arena, d = E.def, u = ar.u;
    g.fillStyle = 'rgba(10,8,24,0.72)';
    g.fillRect(ar.x, ar.y, ar.w, ar.h);
    const dual = E.needDual;
    // у ландшафті на двох гравців кожна половина низька: картка ширша, а шрифт стискається, щоб вміститися
    const maxH = dual ? ar.h / 2 - 12 : ar.h - 40;
    const cw = Math.min(ar.w - 28, ar.w > ar.h * 1.6 ? 560 : 380);
    E.dual(
      g,
      (cx, cy) => {
        const measure = (k) => {
          const titleS = Math.min(26, cw * 0.075) * k;
          const bodyS = Math.min(15.5, cw * 0.044) * k;
          const verbS = Math.min(30, cw * 0.085) * k;
          g.font = `600 ${bodyS}px ${G.FONT_B}`;
          const lines = E.wrap(g, d.desc, cw - 36);
          const verbH = d.verb ? verbS * 1.5 : 0;
          const need = 64 * k + titleS * 1.4 + verbH + lines.length * bodyS * 1.38 + 40 * k;
          return { titleS, bodyS, verbS, lines, verbH, need };
        };
        let k = 1, m = measure(1);
        if (m.need > maxH) { k = maxH / m.need; m = measure(k); }
        const { titleS, bodyS, verbS, lines, verbH } = m;
        const ch = Math.min(maxH, m.need);
        const top = dual ? cy - ch / 2 : ar.cy - ch / 2;
        U.rr(g, cx - cw / 2, top, cw, ch, 18);
        g.fillStyle = '#231C47';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.stroke();
        let y = top + 34 * k;
        E.emoji(g, d.icon, cx - cw / 2 + 38 * k, y, 34 * k);
        E.txt(g, d.name.toUpperCase(), cx - cw / 2 + 66 * k, y + 1, titleS, '#F6F1FF', { align: 'left', weight: 800 });
        y += 34 * k + titleS * 0.4;
        if (d.verb) {
          const pulse = 1 + Math.sin(E.t * 6) * 0.04;
          g.save();
          g.translate(cx, y + verbS * 0.45);
          g.scale(pulse, pulse);
          E.txt(g, d.verb, 0, 0, verbS, '#FFC530', { weight: 900, stroke: '#140F2E', strokeW: verbS * 0.16 });
          g.restore();
          y += verbH;
        }
        g.fillStyle = 'rgba(246,241,255,0.86)';
        g.font = `600 ${bodyS}px ${G.FONT_B}`;
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        for (const ln of lines) {
          g.fillText(ln, cx - cw / 2 + 18, y);
          y += bodyS * 1.38;
        }
        const pulse = 0.55 + 0.45 * Math.sin(E.t * 5);
        g.globalAlpha = pulse;
        E.txt(g, 'Натисніть свою кнопку, коли готові', cx, top + ch - 14 * k, Math.min(13, cw * 0.036) * k, '#FFC530', { body: true, weight: 800 });
        g.globalAlpha = 1;
      },
      ar.h * 0.25
    );
  }

  function drawCount(g) {
    const ar = E.arena;
    const k = Math.floor(E.phaseT / 0.75);
    const f = (E.phaseT % 0.75) / 0.75;
    const num = String(3 - k);
    g.fillStyle = 'rgba(10,8,24,0.35)';
    g.fillRect(ar.x, ar.y, ar.w, ar.h);
    const s = ar.u * 26 * (1.25 - 0.25 * U.outBack(Math.min(1, f * 2)));
    g.globalAlpha = 1 - f * 0.6;
    E.dual(g, (cx, cy) => E.txt(g, num, cx, cy, s, '#F6F1FF', { stroke: '#0E0B1F', strokeW: s * 0.12 }), ar.h * 0.2);
    g.globalAlpha = 1;
  }
  function drawGo(g) {
    const ar = E.arena;
    const f = E.playT / 0.6;
    g.globalAlpha = 1 - f;
    const s = ar.u * 18 * (1 + f * 0.4);
    E.dual(g, (cx, cy) => E.txt(g, 'ГО!', cx, cy, s, '#FFC530', { stroke: '#0E0B1F', strokeW: s * 0.12 }), ar.h * 0.2);
    g.globalAlpha = 1;
  }

  E.winText = function (ids) {
    if (!ids || !ids.length) return 'НІЧИЯ';
    if (ids.length === E.n) return 'НІЧИЯ';
    if (ids.length === 1) {
      const p = E.byId(ids[0]);
      return (p.bot ? 'БОТ ' : '') + p.name.toUpperCase() + ' ПЕРЕМІГ!';
    }
    return 'ПЕРЕМОГЛИ: ' + ids.map((id) => E.byId(id).name.toUpperCase()).join(' + ');
  };

  function drawResult(g) {
    const ar = E.arena, u = ar.u;
    const k = Math.min(1, E.phaseT / 0.5);
    g.fillStyle = `rgba(10,8,24,${0.7 * k})`;
    g.fillRect(ar.x, ar.y, ar.w, ar.h);
    const ids = E.winners || [];
    const isDraw = !ids.length || ids.length === E.n;
    const col = isDraw ? '#F6F1FF' : G.COLORS[ids[0]].c;
    const sc = U.outBack(k);
    E.dual(
      g,
      (cx, cy) => {
        g.save();
        g.translate(cx, cy);
        g.scale(sc, sc);
        // персонажі: переможець стрибає в короні, решта — засмучені
        const ar2 = Math.min(7.5 * u, (ar.w * 0.8) / (E.n * 2.6));
        E.players.forEach((p, i) => {
          const won = !isDraw && ids.includes(p.id);
          const x = (i - (E.n - 1) / 2) * ar2 * 2.6;
          const r = won ? ar2 * 1.25 : ar2;
          E.avatar(g, x, -15 * u, r, p, won ? 'happy' : isDraw ? 'idle' : E.out[p.id] ? 'out' : 'hurt');
          if (won) E.crown(g, x, -15 * u - r * 1.25 - Math.abs(Math.sin(E.t * 9 + p.seat * 0.7)) * r * 0.35, r * 0.55, '#FFC530');
        });
        const txt = E.winText(ids);
        let s = Math.min(7.2 * u, 26);
        g.font = `900 ${s}px ${G.FONT_D}`;
        const mw = g.measureText(txt).width;
        if (mw > ar.w * 0.86) s *= (ar.w * 0.86) / mw;
        const pw = Math.min(ar.w - 16, Math.max(mw, 60 * u) + 10 * u);
        U.rr(g, -pw / 2, -6 * u, pw, (E.resultNote ? 21 : 14) * u + (E.phaseT > 1.1 ? 8 * u : 0), 4 * u);
        g.fillStyle = 'rgba(16,12,36,0.92)';
        g.fill();
        E.txt(g, txt, 0, isDraw ? -2 * u : 3 * u, s, col, { weight: 900, stroke: '#0E0B1F', strokeW: s * 0.2 });
        if (E.resultNote) E.txt(g, E.resultNote, 0, 10 * u, Math.min(4 * u, 15), 'rgba(246,241,255,0.85)', { body: true, weight: 700 });
        if (E.phaseT > 1.1) {
          g.globalAlpha = 0.55 + 0.45 * Math.sin(E.t * 5);
          E.txt(g, 'Торкніться, щоб продовжити', 0, 18 * u, Math.min(3.6 * u, 14), '#FFC530', { body: true, weight: 800 });
          g.globalAlpha = 1;
        }
        g.restore();
      },
      ar.h * 0.22
    );
  }

  function drawButtons(g) {
    const W = E.W, H = E.H, bh = E.bh;
    // порожні місця
    g.fillStyle = '#0E0B1F';
    g.fillRect(0, 0, W, bh);
    g.fillRect(0, H - bh, W, bh);
    if (E.n >= 3) {
      E.seats.forEach((s, i) => {
        if (E.players.some((p) => p.seat === i)) return;
        const b = s.btn, pad = 6;
        U.rr(g, b.x + pad, b.y + pad, b.w - pad * 2, b.h - pad * 2, 16);
        g.strokeStyle = 'rgba(255,255,255,0.1)';
        g.setLineDash([6, 6]);
        g.lineWidth = 2;
        g.stroke();
        g.setLineDash([]);
        // порожня панель
        const P = s.panel;
        g.fillStyle = 'rgba(14,11,31,0.5)';
        if (E.def && E.def.lanes) g.fillRect(P.x, P.y, P.w, P.h);
      });
    }
    for (const p of E.players) drawButton(g, p);
  }

  function drawButton(g, p) {
    const b = p.btn, pad = 6;
    const pressed = E.down[p.id];
    const out = E.out[p.id] && (E.phase === 'play' || E.phase === 'result' || E.phase === 'done');
    const w = b.w - pad * 2, h = b.h - pad * 2;
    const depth = Math.min(8, h * 0.1);
    g.save();
    g.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (p.rot) g.rotate(Math.PI);
    const c = out ? { c: '#4A4468', d: '#2C2747', l: '#8D86B0' } : p.color;
    // основа
    U.rr(g, -w / 2, -h / 2 + depth, w, h - depth, 16);
    g.fillStyle = c.d;
    g.fill();
    const off = pressed ? depth : 0;
    U.rr(g, -w / 2, -h / 2 + off, w, h - depth, 16);
    g.fillStyle = c.c;
    g.fill();
    // відблиск
    g.save();
    U.rr(g, -w / 2, -h / 2 + off, w, h - depth, 16);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(-w / 2, -h / 2 + off, w, (h - depth) * 0.42);
    g.restore();

    if (isStick() && E.phase !== 'intro' && !out && E.phase !== 'result' && E.phase !== 'done') {
      g.restore();
      drawStick(g, p);
      return;
    }
    let label = (E.def && E.def.btn) || 'ТИСНИ';
    let sub = '';
    if (E.phase === 'intro') {
      label = E.ready[p.id] ? 'ГОТОВИЙ ✓' : 'ГОТОВИЙ?';
    } else if (out) label = 'ВИБУВ';
    else if (E.phase === 'result' || E.phase === 'done') {
      label = E.winners && E.winners.includes(p.id) && E.winners.length < E.n ? 'ПЕРЕМОГА' : 'ДАЛІ';
    } else if (E.inst && E.inst.label) {
      const l = E.inst.label(p);
      if (l) label = l;
    }
    if (p.bot) sub = 'БОТ';
    const cy = -depth / 2 + off;
    const s = Math.min(h * 0.26, w * 0.085, 20);
    const ink = out ? '#B9B3D6' : '#1A1233';
    if (sub) {
      E.txt(g, label, 0, cy - s * 0.35, s, ink, { weight: 900 });
      E.txt(g, '● ' + sub, 0, cy + s * 0.85, s * 0.6, U.alpha(ink, 0.7), { body: true, weight: 800 });
    } else E.txt(g, label, 0, cy, s, ink, { weight: 900 });
    if (E.phase === 'intro' && E.ready[p.id]) {
      g.strokeStyle = '#fff';
      g.lineWidth = 3;
      U.rr(g, -w / 2 + 3, -h / 2 + off + 3, w - 6, h - depth - 6, 13);
      g.stroke();
    }
    g.restore();
  }

  function drawStick(g, p) {
    const b = p.btn, st = E.stick[p.id], R = E.stickR();
    const pad = 6;
    U.rr(g, b.x + pad, b.y + pad, b.w - pad * 2, b.h - pad * 2, 16);
    g.fillStyle = p.color.d;
    g.fill();
    const touched = st.on && st.ox && !p.bot;
    const cx = touched ? st.ox : b.x + b.w / 2, cy = touched ? st.oy : b.y + b.h / 2;
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = U.alpha(p.color.l, 0.6);
    g.stroke();
    g.beginPath();
    g.arc(cx + st.x * R * 0.55, cy + st.y * R * 0.55, R * 0.48, 0, TAU);
    g.fillStyle = p.color.c;
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath();
    g.arc(cx + st.x * R * 0.55 - R * 0.12, cy + st.y * R * 0.55 - R * 0.12, R * 0.18, 0, TAU);
    g.fill();
    if (p.bot) E.txt(g, 'БОТ', b.x + b.w / 2 + (p.rot ? -1 : 1) * (b.w / 2 - 30), b.y + b.h / 2, 11, U.alpha('#1A1233', 0.7), { body: true, weight: 800 });
  }

  // для автотестів: прокрутити симуляцію без requestAnimationFrame
  E._step = step;
  E._render = render;

  // ---------- реєстр ігор ----------
  G.games = [];
  G.game = (def) => G.games.push(def);
})();
