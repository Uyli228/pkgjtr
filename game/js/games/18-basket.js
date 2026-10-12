(function () {
  const { U } = G;
  G.game({
    id: 'basket', name: 'Кошик', icon: '🧺', tag: 'Спритність', bg: '#16243A', btn: 'РОЗВОРОТ', lanes: true,
    desc: 'Кошик їздить сам. Тисніть, щоб розвернути його, і ловіть фрукти (+1) та зірки (+3). Бомба — мінус 3 і кошик застрягне. 30 секунд.',
    create(E) {
      const TIME = 30, BY = 0.85, HALF = 0.11, SPD = 0.62;
      const FRUITS = ['🍎', '🍐', '🍊', '🍋', '🍇', '🍓', '🍒'];
      const items = [];
      (function build() {
        const r = U.rng((Math.random() * 1e9) | 0);
        let t = 0.4;
        while (t < TIME) {
          const k = r();
          const type = k < 0.15 ? 'bomb' : k < 0.23 ? 'star' : 'fruit';
          items.push({ t, x: r.range(0.08, 0.92), vy: r.range(0.32, 0.5), type, ch: type === 'fruit' ? FRUITS[r.int(0, FRUITS.length - 1)] : type === 'star' ? '⭐' : '💣' });
          t += r.range(0.45, 0.75) * (1 - Math.min(0.4, t * 0.012));
        }
      })();
      const S = {};
      const yOf = (it, now) => -0.05 + (now - it.t) * it.vy;
      return {
        init() {
          for (const p of E.players) S[p.id] = { x: 0.5, dir: Math.random() < 0.5 ? 1 : -1, sc: 0, done: new Set(), stun: 0, bt: 0, wob: 0 };
        },
        update(dt) {
          const now = E.playT;
          for (const p of E.players) {
            const s = S[p.id];
            s.stun = Math.max(0, s.stun - dt);
            s.wob = Math.max(0, s.wob - dt * 4);
            if (s.stun <= 0) {
              s.x += s.dir * SPD * dt;
              if (s.x < 0.1) { s.x = 0.1; s.dir = 1; }
              if (s.x > 0.9) { s.x = 0.9; s.dir = -1; }
            }
            items.forEach((it, i) => {
              if (s.done.has(i) || it.t > now) return;
              const y = yOf(it, now);
              if (y >= BY - 0.02 && y <= BY + 0.03 && Math.abs(it.x - s.x) < HALF + 0.02) {
                s.done.add(i);
                const v = it.type === 'bomb' ? -3 : it.type === 'star' ? 3 : 1;
                s.sc = Math.max(0, s.sc + v);
                s.wob = 1;
                const P = p.panel;
                const wx = P.x + (p.rot ? 1 - s.x : s.x) * P.w, wy = P.y + (p.rot ? 1 - BY : BY) * P.h;
                E.float(wx, wy - (p.rot ? -1 : 1) * 20, (v > 0 ? '+' : '−') + Math.abs(v), v > 0 ? p.color.l : '#FF5468', p.rot);
                if (it.type === 'bomb') {
                  s.stun = 0.7;
                  G.sfx('boom');
                  E.burst(wx, wy, ['#FF5468', '#FFC530'], 14, 0.6);
                } else G.sfx(it.type === 'star' ? 'point' : 'coin');
              } else if (y > BY + 0.1) s.done.add(i);
            });
          }
          if (now >= TIME + 0.5) {
            const v = {};
            E.players.forEach((p) => (v[p.id] = S[p.id].sc));
            E.finish(E.best(v, 'max'));
          }
        },
        bot(p, dt) {
          const s = S[p.id];
          s.bt -= dt;
          if (s.bt > 0 || s.stun > 0) return;
          s.bt = U.rand(0.06, 0.16) * (1.5 - E.skill);
          const now = E.playT;
          let target = null, best = -Infinity;
          let danger = false;
          items.forEach((it, i) => {
            if (s.done.has(i) || it.t > now + 0.2) return;
            const y = yOf(it, now);
            const tl = (BY - y) / it.vy;
            if (tl < 0 || tl > 2.2) return;
            if (it.type === 'bomb') {
              const px = U.clamp(s.x + s.dir * SPD * tl, 0.1, 0.9);
              if (tl < 0.6 && Math.abs(px - it.x) < HALF + 0.04) danger = true;
              return;
            }
            if (Math.abs(it.x - s.x) > SPD * tl + HALF) return;
            const val = (it.type === 'star' ? 3 : 1) / (0.4 + tl);
            if (val > best) {
              best = val;
              target = it;
            }
          });
          if (danger && Math.random() < 0.4 + E.skill * 0.6) {
            E.tap(p.id);
            s.bt = 0.35;
            return;
          }
          if (target && Math.abs(target.x - s.x) > 0.05 && Math.sign(target.x - s.x) !== s.dir) E.tap(p.id);
        },
        press(p) {
          const s = S[p.id];
          if (s.stun > 0) return;
          s.dir *= -1;
          G.sfx('tap', 2);
        },
        draw(g) {
          const now = E.phase === 'play' ? E.playT : E.phase === 'result' || E.phase === 'done' ? TIME + 1 : 0;
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              const gr = g.createLinearGradient(0, 0, 0, h);
              gr.addColorStop(0, '#16243A');
              gr.addColorStop(1, '#22385A');
              g.fillStyle = gr;
              g.fillRect(0, 0, w, h);
              g.fillStyle = '#2E5A3A';
              g.fillRect(0, h * 0.93, w, h * 0.07);
              items.forEach((it, i) => {
                if (s.done.has(i) || it.t > now) return;
                const y = yOf(it, now);
                if (y < -0.1 || y > 1.05) return;
                E.emoji(g, it.ch, it.x * w, y * h, m * 0.085, it.type === 'bomb' ? 0 : Math.sin(now * 3 + i) * 0.3);
              });
              // кошик
              const bx = s.x * w, by = BY * h, bw = HALF * 2 * w, bh = m * 0.08;
              const wob = Math.sin(E.t * 30) * s.wob * 2;
              g.fillStyle = s.stun > 0 ? '#6B6489' : p.color.d;
              g.beginPath();
              g.moveTo(bx - bw / 2 + wob, by);
              g.lineTo(bx + bw / 2 + wob, by);
              g.lineTo(bx + bw * 0.38 + wob, by + bh);
              g.lineTo(bx - bw * 0.38 + wob, by + bh);
              g.closePath();
              g.fill();
              g.strokeStyle = s.stun > 0 ? '#8D86B0' : p.color.c;
              g.lineWidth = 3;
              g.stroke();
              g.beginPath();
              for (let k = 1; k < 4; k++) {
                g.moveTo(bx - bw / 2 + (k * bw) / 4 + wob, by);
                g.lineTo(bx - bw * 0.38 + (k * bw * 0.76) / 4 + wob, by + bh);
              }
              g.stroke();
              // стрілка напрямку
              g.fillStyle = 'rgba(255,255,255,0.5)';
              const ax = bx + s.dir * (bw / 2 + 10);
              g.beginPath();
              g.moveTo(ax + s.dir * 7, by + bh / 2);
              g.lineTo(ax - s.dir * 2, by + bh / 2 - 6);
              g.lineTo(ax - s.dir * 2, by + bh / 2 + 6);
              g.fill();
              E.txt(g, String(s.sc), w / 2, h * 0.07, m * 0.08, '#fff', { weight: 900 });
            });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
