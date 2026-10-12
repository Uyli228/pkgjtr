(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'tug', name: 'Канат', icon: '🪢', tag: 'Швидкість', bg: '#22301F', btn: 'ТЯГНИ',
    desc: 'Усі канати зв’язані вузлом у центрі. Тисніть якнайшвидше, щоб затягти вузол у свою кольорову зону. Чим довше гра, тим сильніший кожен ривок.',
    create(E) {
      const K = { x: 0, y: 0, vx: 0, vy: 0 };
      const lastTap = {}, bt = {}, pull = {}, rate = {}, dir = {};
      // напрямки тяги: на двох і чотирьох — до своїх кутів (протилежні гасять один одного),
      // на трьох — рівно через 120°, щоб ніхто не мав переваги
      function setup() {
        const ar = E.arena;
        E.players.forEach((p, i) => {
          dir[p.id] = E.n === 3 ? [Math.PI / 2, -Math.PI / 6, (-5 * Math.PI) / 6][i] : p.ang + Math.PI;
        });
        for (const p of E.players) {
          const a = dir[p.id];
          const cx = Math.cos(a), cy = Math.sin(a);
          const m = 9 * ar.u;
          const tx = cx ? (ar.w / 2 - m) / Math.abs(cx) : Infinity;
          const ty = cy ? (ar.h / 2 - m) / Math.abs(cy) : Infinity;
          const d = Math.min(tx, ty);
          p._flag = { x: ar.cx + cx * d, y: ar.cy + cy * d, d };
        }
      }
      const flag = (p) => p._flag;
      // скільки вузол просунувся до гравця (0 — центр, 1 — прапорець)
      function prog(p) {
        const a = dir[p.id];
        return ((K.x - E.arena.cx) * Math.cos(a) + (K.y - E.arena.cy) * Math.sin(a)) / flag(p).d;
      }
      const WIN = 0.72;
      return {
        init() {
          K.x = E.arena.cx;
          K.y = E.arena.cy;
          setup();
          for (const p of E.players) {
            lastTap[p.id] = -1;
            bt[p.id] = U.rand(0.2, 0.4);
            pull[p.id] = 0;
            rate[p.id] = U.lerp(5, 8.5, E.skill) * U.rand(0.8, 1.2);
          }
        },
        resize() {
          setup();
        },
        update(dt) {
          const ar = E.arena;
          const damp = Math.exp(-3 * dt);
          K.vx *= damp;
          K.vy *= damp;
          K.x = U.clamp(K.x + K.vx * dt, ar.x + 4 * ar.u, ar.x + ar.w - 4 * ar.u);
          K.y = U.clamp(K.y + K.vy * dt, ar.y + 4 * ar.u, ar.y + ar.h - 4 * ar.u);
          for (const p of E.players) {
            pull[p.id] = Math.max(0, pull[p.id] - dt * 4);
            if (prog(p) >= WIN) return E.finish([p.id]);
          }
          if (E.playT > 60) {
            const d = {};
            for (const p of E.players) d[p.id] = prog(p);
            E.finish(E.best(d, 'max'));
          }
        },
        bot(p, dt) {
          bt[p.id] -= dt;
          if (bt[p.id] <= 0) {
            E.tap(p.id);
            bt[p.id] = 1 / (rate[p.id] * U.rand(0.85, 1.15));
          }
        },
        press(p) {
          if (E.playT - lastTap[p.id] < 0.07) return;
          lastTap[p.id] = E.playT;
          const a = dir[p.id];
          const imp = 10 * E.arena.u * (1 + E.playT / 7);
          K.vx += Math.cos(a) * imp;
          K.vy += Math.sin(a) * imp;
          pull[p.id] = 1;
          G.sfx('tap', p.seat);
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#26371F';
          for (let i = 0; i < 40; i++) {
            const x = ar.x + ((i * 0.618) % 1) * ar.w, y = ar.y + ((i * 0.382 + 0.1) % 1) * ar.h;
            g.fillRect(x, y, 1.5, 4);
          }
          // зони перемоги: смуга, яку треба перетнути вузлом
          g.save();
          g.beginPath();
          g.rect(ar.x, ar.y, ar.w, ar.h);
          g.clip();
          for (const p of E.players) {
            const f = flag(p), a = dir[p.id];
            const bx = ar.cx + Math.cos(a) * f.d * WIN, by = ar.cy + Math.sin(a) * f.d * WIN;
            g.save();
            g.translate(bx, by);
            g.rotate(a);
            g.fillStyle = U.alpha(p.color.c, 0.16);
            g.fillRect(0, -ar.h, ar.h, ar.h * 2);
            g.strokeStyle = p.color.c;
            g.lineWidth = 0.6 * u;
            g.setLineDash([1.5 * u, 1.5 * u]);
            g.beginPath();
            g.moveTo(0, -ar.h);
            g.lineTo(0, ar.h);
            g.stroke();
            g.setLineDash([]);
            g.restore();
          }
          g.restore();
          // канати
          for (const p of E.players) {
            const f = flag(p);
            const tight = pull[p.id];
            const mx = (f.x + K.x) / 2, my = (f.y + K.y) / 2;
            const sag = (1 - tight) * 3 * u;
            g.strokeStyle = '#C9A26B';
            g.lineWidth = 1.6 * u;
            g.beginPath();
            g.moveTo(K.x, K.y);
            g.quadraticCurveTo(mx + sag, my + sag, f.x, f.y);
            g.stroke();
            g.strokeStyle = 'rgba(110,74,34,0.6)';
            g.lineWidth = 0.5 * u;
            g.setLineDash([1.2 * u, 1.2 * u]);
            g.stroke();
            g.setLineDash([]);
            g.fillStyle = '#E6E1F7';
            g.fillRect(f.x - 0.4 * u, f.y - 8 * u, 0.8 * u, 9 * u);
            g.fillStyle = p.color.c;
            g.beginPath();
            g.moveTo(f.x + 0.4 * u, f.y - 8 * u);
            g.lineTo(f.x + 6 * u, f.y - 6 * u);
            g.lineTo(f.x + 0.4 * u, f.y - 4 * u);
            g.fill();
          }
          g.beginPath();
          g.arc(K.x, K.y, 4.2 * u, 0, TAU);
          g.fillStyle = '#E04050';
          g.fill();
          g.lineWidth = 0.8 * u;
          g.strokeStyle = '#7A1E2A';
          g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.3)';
          g.beginPath();
          g.arc(K.x - 1.3 * u, K.y - 1.3 * u, 1.2 * u, 0, TAU);
          g.fill();
          for (const p of E.players) {
            const v = Math.max(0, Math.round((prog(p) / WIN) * 100));
            E.hud(g, p, Math.min(100, v) + '%', { color: p.color.l });
          }
        },
      };
    },
  });
})();
