(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'race', name: 'Перегони', icon: '🏎️', tag: 'Керування', bg: '#1F3A22', btn: 'ПОВОРОТ',
    desc: 'Машина їде сама. Тримайте кнопку — вона повертає ліворуч, відпустіть — їде прямо. На траві машина гальмує. Хто перший проїде 3 кола?',
    create(E) {
      const LAPS = 3;
      const C = {};
      let rx = 0, ry = 0, halfW = 0;
      const pt = (th) => [E.arena.cx + rx * Math.cos(th), E.arena.cy + ry * Math.sin(th)];
      const thOf = (x, y) => Math.atan2((y - E.arena.cy) / ry, (x - E.arena.cx) / rx);
      function offTrack(x, y) {
        const e = Math.hypot((x - E.arena.cx) / rx, (y - E.arena.cy) / ry);
        return Math.abs(e - 1) * Math.min(rx, ry) > halfW;
      }
      return {
        init() {
          const ar = E.arena, u = ar.u;
          rx = ar.w * 0.36;
          ry = ar.h * 0.38;
          halfW = 9 * u;
          E.players.forEach((p, i) => {
            const off = (i - (E.n - 1) / 2) * halfW * 0.5;
            const [x, y] = pt(Math.PI / 2);
            C[p.id] = { x: x - (i % 2) * 6 * u, y: y + off, h: 0, v: 0, prog: 0, last: Math.PI / 2, bt: 0, noise: 0 };
            C[p.id].last = thOf(C[p.id].x, C[p.id].y);
          });
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = 3.6 * u;
          for (const p of E.players) {
            const c = C[p.id];
            if (E.down[p.id]) c.h -= 2.5 * dt;
            const off = offTrack(c.x, c.y);
            const vmax = (off ? 15 : 40) * u;
            c.v += U.clamp(vmax - c.v, -60 * u * dt, 26 * u * dt);
            c.x = U.clamp(c.x + Math.cos(c.h) * c.v * dt, ar.x + r, ar.x + ar.w - r);
            c.y = U.clamp(c.y + Math.sin(c.h) * c.v * dt, ar.y + r, ar.y + ar.h - r);
            const th = thOf(c.x, c.y);
            c.prog -= U.angDiff(c.last, th);
            c.last = th;
            if (c.prog >= LAPS * TAU) return E.finish([p.id]);
          }
          for (let i = 0; i < E.players.length; i++)
            for (let j = i + 1; j < E.players.length; j++) {
              const a = C[E.players[i].id], b = C[E.players[j].id];
              const d = U.dist(a.x, a.y, b.x, b.y);
              if (d < r * 2 && d > 0) {
                const k = (r * 2 - d) / d / 2;
                const dx = (b.x - a.x) * k, dy = (b.y - a.y) * k;
                a.x -= dx;
                a.y -= dy;
                b.x += dx;
                b.y += dy;
                a.v *= 0.97;
                b.v *= 0.97;
              }
            }
          if (E.playT > 120) {
            const pr = {};
            E.players.forEach((p) => (pr[p.id] = C[p.id].prog));
            E.finish(E.best(pr, 'max'));
          }
        },
        bot(p, dt) {
          const c = C[p.id];
          c.bt -= dt;
          if (c.bt <= 0) {
            c.bt = U.rand(0.04, 0.1);
            c.noise = U.gauss() * U.lerp(0.35, 0.06, E.skill);
          }
          const th = thOf(c.x, c.y);
          const look = 0.3 + (c.v / (40 * E.arena.u)) * 0.15;
          const [tx, ty] = pt(th - look);
          const want = Math.atan2(ty - c.y, tx - c.x);
          const diff = U.angDiff(c.h, want) + c.noise;
          const hold = diff < -0.04 || diff > 2.2;
          if (hold !== E.down[p.id]) E.hold(p.id, hold);
        },
        label(p) {
          const lap = Math.min(LAPS, Math.floor(Math.max(0, C[p.id].prog) / TAU) + 1);
          return E.phase === 'play' ? `КОЛО ${lap}/${LAPS}` : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#244A28';
          for (let i = 0; i < 30; i++) g.fillRect(ar.x + ((i * 0.618) % 1) * ar.w, ar.y + ((i * 0.37 + 0.1) % 1) * ar.h, 2, 5);
          // траса
          g.lineWidth = halfW * 2 + 2 * u;
          g.strokeStyle = '#E6E1F7';
          g.beginPath();
          g.ellipse(ar.cx, ar.cy, rx, ry, 0, 0, TAU);
          g.stroke();
          g.lineWidth = halfW * 2;
          g.strokeStyle = '#3A3848';
          g.stroke();
          g.lineWidth = 0.5 * u;
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.setLineDash([3 * u, 3 * u]);
          g.stroke();
          g.setLineDash([]);
          // старт / фініш
          const [sx, sy] = pt(Math.PI / 2);
          const sq = halfW / 3;
          for (let i = 0; i < 6; i++)
            for (let j = 0; j < 2; j++) {
              g.fillStyle = (i + j) % 2 ? '#111' : '#fff';
              g.fillRect(sx + j * sq - sq, sy - halfW + i * sq, sq, sq);
            }
          for (const p of E.players) {
            const c = C[p.id];
            g.save();
            g.translate(c.x, c.y);
            g.rotate(c.h);
            g.fillStyle = 'rgba(0,0,0,0.35)';
            U.rr(g, -3.4 * u, -1.6 * u, 7 * u, 3.8 * u, u);
            g.fill();
            g.fillStyle = p.color.c;
            U.rr(g, -3.6 * u, -2 * u, 7.2 * u, 4 * u, 1.2 * u);
            g.fill();
            g.fillStyle = 'rgba(20,16,40,0.7)';
            g.fillRect(0.2 * u, -1.4 * u, 1.8 * u, 2.8 * u);
            g.fillStyle = '#111';
            g.fillRect(-3 * u, -2.6 * u, 1.8 * u, 0.8 * u);
            g.fillRect(-3 * u, 1.8 * u, 1.8 * u, 0.8 * u);
            g.fillRect(1.6 * u, -2.6 * u, 1.8 * u, 0.8 * u);
            g.fillRect(1.6 * u, 1.8 * u, 1.8 * u, 0.8 * u);
            g.restore();
          }
          // таблиця позицій
          const order = E.players.slice().sort((a, b) => C[b.id].prog - C[a.id].prog);
          order.forEach((p, i) => E.hud(g, p, `${i + 1} МІСЦЕ`, { color: p.color.l, size: 3.6 * u }));
        },
      };
    },
  });
})();
