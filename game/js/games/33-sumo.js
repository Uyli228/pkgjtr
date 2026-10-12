(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'sumo', name: 'Сумо', icon: '🤼', tag: 'Штовханина', bg: '#140F24', btn: 'РУХ', input: 'stick',
    verb: 'ВИШТОВХУЙ!',
    desc: 'Джойстиком штовхай інших за край. Останній на арені виграв.',
    create(E) {
      const S = {};
      let R0 = 0, Rt = 0;
      const BR = () => 6.5 * E.arena.u;
      return {
        init() {
          const ar = E.arena;
          R0 = Rt = Math.min(ar.w, ar.h) * 0.42;
          for (const p of E.players) {
            const a = Math.atan2(p.ay - ar.cy, p.ax - ar.cx);
            S[p.id] = { x: ar.cx + Math.cos(a) * R0 * 0.6, y: ar.cy + Math.sin(a) * R0 * 0.6, vx: 0, vy: 0, fall: 0, wob: 0 };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = BR();
          Rt = R0 * (E.playT < 8 ? 1 : Math.max(0.3, 1 - (E.playT - 8) * 0.025));
          const fallen = [];
          for (const p of E.players) {
            const s = S[p.id];
            if (E.out[p.id]) {
              s.fall += dt;
              continue;
            }
            const st = E.stick[p.id];
            s.vx += st.x * 160 * u * dt;
            s.vy += st.y * 160 * u * dt;
            const f = Math.exp(-2.2 * dt);
            s.vx *= f;
            s.vy *= f;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.wob = Math.max(0, s.wob - dt * 4);
          }
          const al = E.alive();
          for (let i = 0; i < al.length; i++)
            for (let j = i + 1; j < al.length; j++) {
              const a = S[al[i].id], b = S[al[j].id];
              const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
              if (d < r * 2 && d > 0) {
                const nx = dx / d, ny = dy / d, ov = r * 2 - d;
                a.x -= (nx * ov) / 2;
                a.y -= (ny * ov) / 2;
                b.x += (nx * ov) / 2;
                b.y += (ny * ov) / 2;
                const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (rel > 0) {
                  const k = rel * 1.6;
                  a.vx -= k * nx;
                  a.vy -= k * ny;
                  b.vx += k * nx;
                  b.vy += k * ny;
                  a.wob = b.wob = 1;
                  if (rel > 20 * u) E.shake(Math.min(6, rel / (10 * u)));
                }
              }
            }
          for (const p of al) {
            const s = S[p.id];
            if (U.dist(s.x, s.y, ar.cx, ar.cy) > Rt + r * 0.4) {
              fallen.push(p.id);
              E.burst(s.x, s.y, p.color.c, 18);
              E.eliminate(p.id);
            }
          }
          if (fallen.length) E.lastStanding(fallen);
          if (E.playT > 45 && E.phase === 'play') {
            const d = {};
            for (const p of E.alive()) d[p.id] = U.dist(S[p.id].x, S[p.id].y, ar.cx, ar.cy);
            E.finish(E.best(d, 'min'));
          }
        },
        bot(p) {
          const s = S[p.id], ar = E.arena;
          const dc = U.dist(s.x, s.y, ar.cx, ar.cy);
          let tx = ar.cx, ty = ar.cy;
          if (dc < Rt * 0.6) {
            let bd = Infinity;
            for (const q of E.alive()) {
              if (q.id === p.id) continue;
              const o = S[q.id], d = U.dist(s.x, s.y, o.x, o.y);
              if (d < bd) {
                bd = d;
                // цілимось трохи «за» суперника, щоб виштовхнути його назовні
                const oc = Math.hypot(o.x - ar.cx, o.y - ar.cy) || 1;
                tx = o.x + ((o.x - ar.cx) / oc) * 6 * ar.u;
                ty = o.y + ((o.y - ar.cy) / oc) * 6 * ar.u;
              }
            }
          }
          const noise = U.lerp(0.5, 0.1, E.skill);
          const dx = tx - s.x + U.gauss() * noise * 10 * ar.u, dy = ty - s.y + U.gauss() * noise * 10 * ar.u;
          const l = Math.hypot(dx, dy) || 1;
          E.setStick(p.id, (dx / l) * U.lerp(0.7, 1, E.skill), (dy / l) * U.lerp(0.7, 1, E.skill));
        },
        draw(g) {
          const ar = E.arena, u = ar.u, r = BR();
          g.beginPath();
          g.arc(ar.cx, ar.cy, R0 + r, 0, TAU);
          g.fillStyle = '#231A3A';
          g.fill();
          g.beginPath();
          g.arc(ar.cx, ar.cy, Rt, 0, TAU);
          g.fillStyle = '#D9B98A';
          g.fill();
          g.lineWidth = 1.6 * u;
          g.strokeStyle = '#8A6A3C';
          g.stroke();
          for (const p of E.players) {
            const s = S[p.id];
            const k = E.out[p.id] ? Math.max(0, 1 - s.fall * 2) : 1;
            if (k <= 0) continue;
            g.save();
            g.translate(s.x, s.y);
            g.scale(k, k);
            E.avatar(g, 0, 0, r, p, E.out[p.id] ? 'out' : s.wob > 0.3 ? 'scared' : U.dist(s.x, s.y, ar.cx, ar.cy) > Rt * 0.75 ? 'scared' : 'sly');
            g.restore();
          }
        },
      };
    },
  });
})();
