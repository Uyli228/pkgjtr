(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'monster', name: 'Монстр атакує', icon: '👾', tag: 'Ухиляння', bg: '#1A1230', btn: 'РУХ', input: 'stick',
    verb: 'ТІКАЙ!',
    desc: 'Джойстиком тікай з червоних кіл. Останній живий виграв.',
    create(E) {
      const S = {};
      let hits = [], spawnT = 1, eye = 0;
      const R = () => 4.5 * E.arena.u;
      return {
        init() {
          for (const p of E.players) {
            const h = E.home(p, 18 * E.arena.u);
            S[p.id] = { x: h.x, y: h.y, wx: h.x, wy: h.y };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = R();
          for (const p of E.alive()) {
            const s = S[p.id], st = E.stick[p.id];
            s.x = U.clamp(s.x + st.x * 40 * u * dt, ar.x + r, ar.x + ar.w - r);
            s.y = U.clamp(s.y + st.y * 40 * u * dt, ar.y + r, ar.y + ar.h - r);
          }
          spawnT -= dt;
          eye += dt;
          if (spawnT <= 0) {
            spawnT = Math.max(0.3, 1.1 - E.playT * 0.04);
            const al = E.alive();
            // монстр цілиться в когось, а згодом — у всіх одразу
            const targets = E.playT > 15 ? al : [U.pick(al)];
            for (const target of targets) {
              const s = S[target.id];
              const rad = U.rand(10, 15 + Math.min(10, E.playT * 0.3)) * u;
              hits.push({ x: s.x + U.rand(-6, 6) * u, y: s.y + U.rand(-6, 6) * u, r: rad, t: 0, warn: Math.max(0.5, 1.1 - E.playT * 0.02) });
            }
          }
          const dead = [];
          for (const h of hits) {
            h.t += dt;
            if (!h.done && h.t >= h.warn) {
              h.done = true;
              E.shake(4);
              for (const p of E.alive()) {
                const s = S[p.id];
                if (U.dist(s.x, s.y, h.x, h.y) < h.r + r * 0.5 && !dead.includes(p.id)) dead.push(p.id);
              }
            }
          }
          hits = hits.filter((h) => h.t < h.warn + 0.4);
          for (const id of dead) {
            const s = S[id];
            E.burst(s.x, s.y, G.COLORS[id].c, 20);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
          if (E.playT > 60 && E.phase === 'play') E.finish(E.alive().map((q) => q.id));
        },
        bot(p) {
          const s = S[p.id], ar = E.arena, u = ar.u;
          let dx = 0, dy = 0;
          for (const h of hits) {
            if (h.done) continue;
            const d = U.dist(s.x, s.y, h.x, h.y);
            const sees = h.t > U.lerp(0.45, 0.12, E.skill);
            if (sees && d < h.r + 8 * u) {
              dx += (s.x - h.x) / (d || 1);
              dy += (s.y - h.y) / (d || 1);
            }
          }
          if (!dx && !dy) {
            // тримаємось ближче до центру своєї чверті
            if (U.dist(s.x, s.y, s.wx, s.wy) < 4 * u || Math.random() < 0.01) {
              s.wx = ar.x + U.rand(0.15, 0.85) * ar.w;
              s.wy = ar.y + U.rand(0.15, 0.85) * ar.h;
            }
            dx = (s.wx - s.x) * 0.05;
            dy = (s.wy - s.y) * 0.05;
          }
          E.setStick(p.id, dx * 2, dy * 2);
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // монстр у центрі
          const pulse = 1 + Math.sin(E.t * 4) * 0.04;
          g.fillStyle = '#5B2A86';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 11 * u * pulse, 0, TAU);
          g.fill();
          g.fillStyle = '#fff';
          g.beginPath();
          g.arc(ar.cx, ar.cy - 1 * u, 5 * u, 0, TAU);
          g.fill();
          g.fillStyle = '#FF5468';
          g.beginPath();
          g.arc(ar.cx + Math.cos(eye) * 2 * u, ar.cy - 1 * u + Math.sin(eye * 1.3) * 2 * u, 2.2 * u, 0, TAU);
          g.fill();
          for (const h of hits) {
            if (!h.done) {
              const k = h.t / h.warn;
              g.fillStyle = `rgba(255,84,104,${0.15 + k * 0.25})`;
              g.beginPath();
              g.arc(h.x, h.y, h.r, 0, TAU);
              g.fill();
              g.strokeStyle = '#FF5468';
              g.lineWidth = 0.6 * u;
              g.beginPath();
              g.arc(h.x, h.y, h.r * k, 0, TAU);
              g.stroke();
            } else {
              g.fillStyle = `rgba(91,42,134,${1 - (h.t - h.warn) / 0.4})`;
              g.beginPath();
              g.arc(h.x, h.y, h.r, 0, TAU);
              g.fill();
            }
          }
          for (const p of E.players) {
            if (E.out[p.id]) continue;
            const s = S[p.id];
            const danger = hits.some((h) => !h.done && U.dist(s.x, s.y, h.x, h.y) < h.r);
            E.avatar(g, s.x, s.y, R(), p, danger ? 'scared' : 'idle');
          }
        },
      };
    },
  });
})();
