(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'racing', name: 'Перегони', icon: '🏎️', tag: 'Перегони', bg: '#2E5A2A', btn: 'ВЛІВО',
    verb: 'ВХОДЬ У ПОВОРОТ!',
    desc: 'Машина їде сама. Тримай — кермо вліво. 3 кола — переміг.',
    create(E) {
      const LAPS = 3, TURN = 4.2;
      const S = {};
      let T = null; // траса-стадіон
      function track() {
        const ar = E.arena;
        const Rm = ar.h * 0.32, TW = ar.h * 0.27;
        const L = Math.max(0, ar.w / 2 - Rm - TW / 2 - ar.h * 0.06);
        T = { Rm, TW, L, cx: ar.cx, cy: ar.cy };
      }
      // найближча точка осьового відрізка
      function axis(x, y) {
        const px = U.clamp(x, T.cx - T.L, T.cx + T.L);
        return { px, py: T.cy, d: U.dist(x, y, px, T.cy) };
      }
      return {
        init() {
          track();
          const u = E.arena.u;
          E.players.forEach((p, i) => {
            const off = (i - (E.n - 1) / 2) * (T.TW / Math.max(2, E.n)) * 0.9;
            S[p.id] = { x: T.cx - 6 * u - (i % 2) * 6 * u, y: T.cy + T.Rm + off, a: 0, v: 0, lap: 0, half: false, slow: 0, prog: 0 };
          });
        },
        resize() {
          track();
        },
        update(dt) {
          const u = E.arena.u;
          const VMAX = T.Rm * 3.4;
          for (const p of E.players) {
            const s = S[p.id];
            s.slow = Math.max(0, s.slow - dt);
            if (E.down[p.id]) s.a -= TURN * dt;
            s.v = Math.min(VMAX * (s.slow > 0 ? 0.45 : 1), s.v + VMAX * 1.2 * dt);
            const px = s.x;
            s.x += Math.cos(s.a) * s.v * dt;
            s.y += Math.sin(s.a) * s.v * dt;
            // борти: повертаємо на трасу і пригальмовуємо
            const ax = axis(s.x, s.y);
            const off = ax.d - T.Rm;
            if (Math.abs(off) > T.TW / 2) {
              const k = (ax.d - Math.sign(off) * (Math.abs(off) - T.TW / 2)) / ax.d;
              s.x = ax.px + (s.x - ax.px) * k;
              s.y = ax.py + (s.y - ax.py) * k;
              if (s.slow <= 0) {
                E.burst(s.x, s.y, '#B9A27A', 6, 0.5);
                G.sfx('thud');
              }
              s.slow = 0.35;
            }
            // кола: верхня половина, потім лінія старту внизу
            if (s.y < T.cy) s.half = true;
            if (s.half && s.y > T.cy && px < T.cx && s.x >= T.cx) {
              s.lap++;
              s.half = false;
              if (s.lap >= LAPS) return E.finish([p.id]);
              E.float(s.x, s.y - 6 * u, s.lap + 1 + '/' + LAPS, p.color.l, p.rot);
              G.sfx('point');
            }
          }
          // машинки штовхаються
          for (let i = 0; i < E.n; i++)
            for (let j = i + 1; j < E.n; j++) {
              const a = S[E.players[i].id], b = S[E.players[j].id];
              const d = U.dist(a.x, a.y, b.x, b.y), r = 3.6 * u;
              if (d < r * 2 && d > 0) {
                const k = (r * 2 - d) / 2 / d;
                a.x -= (b.x - a.x) * k;
                a.y -= (b.y - a.y) * k;
                b.x += (b.x - a.x) * k;
                b.y += (b.y - a.y) * k;
              }
            }
          if (E.playT > 60) {
            const v = {};
            for (const p of E.players) {
              const s = S[p.id];
              v[p.id] = s.lap * 2 + (s.half ? 1 : 0);
            }
            E.finish(E.best(v, 'max'));
          }
        },
        bot(p) {
          const s = S[p.id];
          // точка попереду на осьовій лінії (рух проти годинникової стрілки)
          const ax = axis(s.x, s.y);
          const rx = (s.x - ax.px) / (ax.d || 1), ry = (s.y - ax.py) / (ax.d || 1);
          const look = T.Rm * U.lerp(0.5, 0.8, E.skill);
          // дотична проти годинникової (на екрані): (ry, -rx)
          let tx = ax.px + rx * T.Rm + ry * look, ty = ax.py + ry * T.Rm - rx * look;
          if (s.noise == null || Math.random() < 0.02) s.noise = U.gauss() * U.lerp(0.25, 0.04, E.skill);
          const d = U.angDiff(s.a, Math.atan2(ty - s.y, tx - s.x) + s.noise);
          E.hold(p.id, d < -0.06);
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const lane = (r, style, w) => {
            g.beginPath();
            g.arc(T.cx + T.L, T.cy, r, -Math.PI / 2, Math.PI / 2);
            g.arc(T.cx - T.L, T.cy, r, Math.PI / 2, (3 * Math.PI) / 2);
            g.closePath();
            g.strokeStyle = style;
            g.lineWidth = w;
            g.stroke();
          };
          lane(T.Rm, '#4A4558', T.TW);
          lane(T.Rm + T.TW / 2, '#F6F1FF', 2);
          lane(T.Rm - T.TW / 2, '#F6F1FF', 2);
          g.setLineDash([3 * u, 3 * u]);
          lane(T.Rm, 'rgba(255,255,255,0.3)', 1);
          g.setLineDash([]);
          // старт-фініш
          for (let i = 0; i < 6; i++) {
            g.fillStyle = i % 2 ? '#111' : '#eee';
            g.fillRect(T.cx - 1.5 * u, T.cy + T.Rm - T.TW / 2 + (i * T.TW) / 6, 3 * u, T.TW / 6);
          }
          for (const p of E.players) {
            const s = S[p.id], r = 3.6 * u;
            g.save();
            g.translate(s.x, s.y);
            g.rotate(s.a);
            g.fillStyle = p.color.c;
            U.rr(g, -r * 1.3, -r * 0.75, r * 2.6, r * 1.5, r * 0.4);
            g.fill();
            g.fillStyle = '#1A1233';
            g.fillRect(-r * 0.9, -r * 0.95, r * 0.6, r * 0.3);
            g.fillRect(-r * 0.9, r * 0.65, r * 0.6, r * 0.3);
            g.fillRect(r * 0.5, -r * 0.95, r * 0.6, r * 0.3);
            g.fillRect(r * 0.5, r * 0.65, r * 0.6, r * 0.3);
            g.restore();
            E.avatar(g, s.x, s.y, r * 0.7, p, s.slow > 0 ? 'scared' : 'happy', s.a + Math.PI / 2);
            E.hud(g, p, 'Коло ' + Math.min(LAPS, s.lap + 1) + '/' + LAPS, { color: p.color.l, size: 4 * u });
          }
          E.emoji(g, '🏁', T.cx, T.cy, 12 * u);
        },
      };
    },
  });
})();
