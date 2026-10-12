(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'sumo', name: 'Сумо', icon: '🤼', tag: 'Штовханина', bg: '#140F24', btn: 'РИВОК',
    desc: 'Стрілка біля кульки крутиться. Затисніть, щоб зупинити її й набрати силу, відпустіть — ривок! Виштовхуйте інших за край. Згодом арена меншає. Останній на арені перемагає.',
    create(E) {
      const S = {};
      let R0 = 0, Rt = 0;
      const BR = () => 6 * E.arena.u;
      return {
        init() {
          const ar = E.arena;
          R0 = Rt = Math.min(ar.w, ar.h) * 0.44;
          E.players.forEach((p) => {
            const a = Math.atan2(p.ay - ar.cy, p.ax - ar.cx);
            S[p.id] = {
              x: ar.cx + Math.cos(a) * R0 * 0.6, y: ar.cy + Math.sin(a) * R0 * 0.6, vx: 0, vy: 0,
              a: a + Math.PI + U.rand(-1, 1), dir: p.seat % 2 ? -1 : 1, ch: 0, charging: false, cd: 0, fall: 0, botCh: 0.4,
            };
          });
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = BR();
          Rt = R0 * (E.playT < 15 ? 1 : Math.max(0.5, 1 - (E.playT - 15) * 0.012));
          const fallen = [];
          for (const p of E.players) {
            const s = S[p.id];
            if (E.out[p.id]) {
              s.fall += dt;
              continue;
            }
            s.cd -= dt;
            if (s.charging) s.ch = Math.min(1, s.ch + dt / 0.7);
            else s.a += 3.1 * dt * s.dir;
            const f = Math.exp(-1.5 * dt);
            s.vx *= f;
            s.vy *= f;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
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
                  const j2 = rel * 1.05;
                  a.vx -= j2 * nx;
                  a.vy -= j2 * ny;
                  b.vx += j2 * nx;
                  b.vy += j2 * ny;
                  if (rel > 15 * u) {
                    G.sfx('thud');
                    E.shake(Math.min(7, rel / (8 * u)));
                  }
                }
              }
            }
          for (const p of al) {
            const s = S[p.id];
            if (U.dist(s.x, s.y, ar.cx, ar.cy) > Rt + r * 0.3) {
              E.eliminate(p.id);
              fallen.push(p.id);
              E.burst(s.x, s.y, p.color.c, 20);
            }
          }
          if (fallen.length && E.lastStanding(fallen)) return;
          if (E.playT > 75) {
            const d = {};
            for (const p of E.alive()) d[p.id] = U.dist(S[p.id].x, S[p.id].y, ar.cx, ar.cy);
            E.finish(E.best(d, 'min'));
          }
        },
        bot(p) {
          const s = S[p.id], ar = E.arena;
          if (s.charging) {
            if (s.ch >= s.botCh) E.hold(p.id, false);
            return;
          }
          if (s.cd > 0) return;
          let tx = ar.cx, ty = ar.cy, edge = U.dist(s.x, s.y, ar.cx, ar.cy) > Rt * 0.68;
          if (!edge) {
            let bd = Infinity;
            for (const q of E.alive()) {
              if (q.id === p.id) continue;
              const o = S[q.id], d = U.dist(s.x, s.y, o.x, o.y);
              if (d < bd) { bd = d; tx = o.x; ty = o.y; }
            }
          }
          const want = Math.atan2(ty - s.y, tx - s.x);
          const tol = 0.12 + (1 - E.skill) * 0.25;
          if (Math.abs(U.angDiff(s.a, want)) < tol && Math.random() < 0.5) {
            s.botCh = edge ? U.rand(0.1, 0.3) : U.rand(0.3, 0.9) * (0.6 + E.skill * 0.4);
            E.hold(p.id, true);
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.cd > 0) return;
          s.charging = true;
          s.ch = 0;
        },
        release(p) {
          const s = S[p.id], u = E.arena.u;
          if (!s.charging) return;
          s.charging = false;
          const imp = (30 + 75 * s.ch) * u;
          s.vx += Math.cos(s.a) * imp;
          s.vy += Math.sin(s.a) * imp;
          s.cd = 0.3;
          G.sfx('whoosh');
        },
        label(p) {
          return S[p.id] && S[p.id].charging ? 'ВІДПУСТИ!' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u, r = BR();
          // помост
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
          g.strokeStyle = 'rgba(138,106,60,0.5)';
          g.lineWidth = 0.6 * u;
          g.beginPath();
          g.moveTo(ar.cx - Rt * 0.25, ar.cy - 2 * u);
          g.lineTo(ar.cx - Rt * 0.1, ar.cy - 2 * u);
          g.moveTo(ar.cx + Rt * 0.1, ar.cy + 2 * u);
          g.lineTo(ar.cx + Rt * 0.25, ar.cy + 2 * u);
          g.stroke();
          for (const p of E.players) {
            const s = S[p.id];
            const k = E.out[p.id] ? Math.max(0, 1 - s.fall * 2) : 1;
            if (k <= 0) continue;
            g.save();
            g.translate(s.x, s.y);
            g.scale(k, k);
            if (!E.out[p.id]) {
              // стрілка напрямку
              const len = r * (1.9 + (s.charging ? s.ch * 1.4 : 0));
              g.strokeStyle = s.charging ? '#fff' : U.alpha(p.color.l, 0.8);
              g.lineWidth = 0.9 * u;
              g.beginPath();
              g.moveTo(Math.cos(s.a) * r * 1.1, Math.sin(s.a) * r * 1.1);
              g.lineTo(Math.cos(s.a) * len, Math.sin(s.a) * len);
              g.stroke();
              g.fillStyle = g.strokeStyle;
              g.beginPath();
              g.arc(Math.cos(s.a) * len, Math.sin(s.a) * len, 1.1 * u, 0, TAU);
              g.fill();
            }
            g.fillStyle = p.color.d;
            g.beginPath();
            g.arc(0, 0.7 * u, r, 0, TAU);
            g.fill();
            g.fillStyle = p.color.c;
            g.beginPath();
            g.arc(0, 0, r, 0, TAU);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.3)';
            g.beginPath();
            g.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, TAU);
            g.fill();
            if (s.charging) {
              g.strokeStyle = '#FFC530';
              g.lineWidth = 0.8 * u;
              g.beginPath();
              g.arc(0, 0, r + 1.2 * u, -Math.PI / 2, -Math.PI / 2 + TAU * s.ch);
              g.stroke();
            }
            g.restore();
          }
          if (E.playT > 13 && E.playT < 16 && E.phase === 'play')
            E.dual(g, (x, y) => E.txt(g, 'АРЕНА МЕНШАЄ!', x, y, 4.5 * u, '#FF5468', { stroke: '#140F24' }), R0 * 0.55, true);
        },
      };
    },
  });
})();
