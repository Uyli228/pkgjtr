(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'laser', name: 'Лазерна стеля', icon: '🔴', tag: 'Ризик', bg: '#120E26', btn: 'ВГОРУ', lanes: true,
    desc: 'Тримай — кулька летить угору, відпусти — падає. Очки капають лише тому, хто зараз найвище з усіх. Але згори опускається лазер: торкнувся — втрачаєш половину очок і падаєш на дно. 25 секунд.',
    create(E) {
      const TIME = 25, R = 0.035;
      const S = {};
      const laser = (t) => 0.95 - 0.34 * Math.min(1, t / 21) + 0.035 * Math.sin(t * 1.9);
      let leader = null;
      return {
        init() {
          for (const p of E.players) S[p.id] = { y: 0, vy: 0, sc: 0, zap: 0, margin: U.lerp(0.13, 0.035, E.skill) + U.rand(0, 0.04) };
        },
        update(dt) {
          const L = laser(E.playT);
          for (const p of E.players) {
            const s = S[p.id];
            s.zap = Math.max(0, s.zap - dt);
            const up = E.down[p.id] && s.zap <= 0;
            s.vy = U.clamp(s.vy + (up ? 2.6 : -2.1) * dt, -1.3, 1.3);
            s.y += s.vy * dt;
            if (s.y < 0) {
              s.y = 0;
              s.vy = 0;
            }
            if (s.y + R >= L) {
              s.sc = Math.floor(s.sc / 2);
              s.y = 0;
              s.vy = 0;
              s.zap = 1.2;
              G.sfx('hit');
              E.shake(4);
              const P = p.panel;
              E.burst(P.x + P.w / 2, P.y + (p.rot ? 1 - L : L) * P.h * 0.92 + (p.rot ? P.h * 0.04 : 0), [p.color.c, '#FF5468', '#fff'], 18);
            }
          }
          leader = null;
          let best = 0.02;
          for (const p of E.players) {
            const s = S[p.id];
            if (s.zap > 0) continue;
            if (s.y > best + 1e-6) {
              best = s.y;
              leader = p.id;
            }
          }
          if (leader != null) S[leader].sc += dt * 10;
          if (E.playT >= TIME) {
            const v = {};
            E.players.forEach((p) => (v[p.id] = Math.floor(S[p.id].sc)));
            E.finish(E.best(v, 'max'), 'Очки: ' + Math.max(...Object.values(v)));
          }
        },
        bot(p) {
          const s = S[p.id];
          const target = laser(E.playT + 0.3) - R - s.margin;
          const want = s.y + s.vy * 0.32 < target;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        label(p) {
          return S[p.id].zap > 0 ? 'ЗАП!' : leader === p.id ? '👑 ЛІДЕР' : null;
        },
        draw(g) {
          const t = E.phase === 'play' ? E.playT : 0;
          const L = laser(t);
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              const top = h * 0.04, H = h * 0.92; // корисна висота
              const Y = (v) => top + H * (1 - v);
              g.fillStyle = '#120E26';
              g.fillRect(0, 0, w, h);
              // шкала
              g.strokeStyle = 'rgba(255,255,255,0.06)';
              for (let k = 0; k <= 10; k++) {
                g.beginPath();
                g.moveTo(0, Y(k / 10));
                g.lineTo(w, Y(k / 10));
                g.stroke();
              }
              // лазер
              const ly = Y(L);
              g.fillStyle = 'rgba(255,84,104,0.18)';
              g.fillRect(0, 0, w, ly);
              g.strokeStyle = '#FF5468';
              g.lineWidth = 3;
              g.beginPath();
              for (let x = 0; x <= w; x += 6) g.lineTo(x, ly + Math.sin(x * 0.3 + E.t * 30) * 1.5);
              g.stroke();
              // суперники — мітки збоку
              for (const q of E.players) {
                if (q.id === p.id) continue;
                g.fillStyle = q.color.c;
                g.fillRect(w - 10, Y(S[q.id].y) - 2, 10, 4);
              }
              // кулька
              const cy = Y(s.y) - m * R, cx = w / 2;
              if (s.zap > 0 && Math.floor(E.t * 12) % 2) g.globalAlpha = 0.4;
              g.fillStyle = p.color.c;
              g.beginPath();
              g.arc(cx, cy, m * R * 1.4, 0, TAU);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,0.35)';
              g.beginPath();
              g.arc(cx - m * R * 0.4, cy - m * R * 0.4, m * R * 0.45, 0, TAU);
              g.fill();
              if (E.down[p.id] && s.zap <= 0) {
                g.fillStyle = '#FFC530';
                g.beginPath();
                g.moveTo(cx - m * R * 0.6, cy + m * R * 1.3);
                g.lineTo(cx, cy + m * R * (2.4 + Math.random()));
                g.lineTo(cx + m * R * 0.6, cy + m * R * 1.3);
                g.fill();
              }
              g.globalAlpha = 1;
              if (leader === p.id) E.emoji(g, '👑', cx, cy - m * R * 3, m * 0.08);
              E.txt(g, String(Math.floor(s.sc)), 10, h - 14, m * 0.075, '#fff', { align: 'left', weight: 900 });
            });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
