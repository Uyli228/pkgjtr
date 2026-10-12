(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'knives', name: 'Ножі в колоду', icon: '🪵', tag: 'Влучність', bg: '#1E1A2E', btn: 'КИДОК',
    verb: 'КИДАЙ!', desc: 'Тап — ніж у колоду. Влучив у ніж — вибув.',
    create(E) {
      const FLIGHT = 0.2, SEP = 0.2;
      const GOAL = E.n >= 3 ? 6 : 8;
      let th = 0, w = 1.8, wTarget = 1.8, chT = 2;
      let knives = []; // {a, owner}
      const AUTO = 5;
      const fly = [], left = {}, cd = {}, bt = {}, lastT = {};
      function launch(p) {
        return E.home(p, (p.corner ? 13 : 16) * E.arena.u);
      }
      function impact(p) {
        return Math.atan2(launch(p).y - E.arena.cy, launch(p).x - E.arena.cx);
      }
      function free(local, margin) {
        return knives.every((k) => Math.abs(U.angDiff(local, k.a)) > margin);
      }
      return {
        init() {
          for (let i = 0; i < 3; i++) {
            let a;
            do a = Math.random() * TAU;
            while (!free(a, 0.6));
            knives.push({ a, owner: -1 });
          }
          for (const p of E.players) {
            left[p.id] = GOAL;
            cd[p.id] = 0;
            bt[p.id] = U.rand(0.3, 0.8);
            lastT[p.id] = 0;
          }
        },
        update(dt) {
          chT -= dt;
          if (chT <= 0) {
            chT = U.rand(1.2, 3);
            const sp = U.rand(1.3, 2.8 + E.playT * 0.02);
            wTarget = (Math.random() < 0.35 ? -Math.sign(w) : Math.sign(w)) * sp;
          }
          w += (wTarget - w) * Math.min(1, dt * 2.5);
          th += w * dt;
          for (const p of E.players) {
            cd[p.id] = Math.max(0, cd[p.id] - dt);
            // хто довго тягне — ніж летить сам
            if (!E.out[p.id] && left[p.id] > 0 && E.playT - lastT[p.id] > AUTO) this.press(p);
          }
          for (const k of fly) {
            k.t += dt;
            if (k.t >= FLIGHT && !k.done) {
              k.done = true;
              const p = E.byId(k.owner);
              const local = impact(p) - th;
              if (!free(local, SEP)) {
                k.bounce = true;
                k.vx = U.rand(-1, 1);
                G.sfx('hit');
                E.shake(6);
                E.eliminate(p.id);
                if (E.lastStanding(E.best(Object.fromEntries(E.players.map((q) => [q.id, GOAL - left[q.id]])), 'max'))) return;
              } else {
                knives.push({ a: local, owner: p.id });
                left[p.id]--;
                G.sfx('stick');
                E.shake(1.5);
                if (left[p.id] <= 0) return E.finish([p.id]);
              }
            }
          }
          for (let i = fly.length - 1; i >= 0; i--) if (fly[i].done && (!fly[i].bounce || fly[i].t > FLIGHT + 0.8)) fly.splice(i, 1);
        },
        bot(p, dt) {
          if (cd[p.id] > 0 || left[p.id] <= 0) return;
          bt[p.id] -= dt;
          if (bt[p.id] > 0) return;
          bt[p.id] = U.rand(0.05, 0.15);
          // прогноз, де опиниться ніж
          const wPerceived = w * (1 + U.gauss() * U.lerp(0.12, 0.02, E.skill));
          const local = impact(p) - (th + wPerceived * FLIGHT) + U.gauss() * U.lerp(0.06, 0.01, E.skill);
          const idle = E.playT - lastT[p.id];
          const margin = SEP + U.lerp(0.04, 0.12, E.skill) * U.clamp(1 - idle / 3.5, 0, 1);
          if (free(local, margin) && !fly.some((k) => !k.done)) E.tap(p.id);
        },
        press(p) {
          if (cd[p.id] > 0 || left[p.id] <= 0) return;
          cd[p.id] = 0.5;
          lastT[p.id] = E.playT;
          fly.push({ owner: p.id, t: 0, done: false });
          G.sfx('whoosh');
        },
        label(p) {
          const rest = AUTO - (E.playT - lastT[p.id]);
          return rest < 3 && E.phase === 'play' ? 'КИДОК ' + Math.ceil(rest) : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const R = 15 * u;
          const knife = (len, col) => {
            g.fillStyle = '#D8DEE9';
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(len * 0.5, -u * 0.9);
            g.lineTo(len * 0.5, u * 0.9);
            g.closePath();
            g.fill();
            g.fillStyle = col;
            U.rr(g, len * 0.48, -u * 1.1, len * 0.52, u * 2.2, u);
            g.fill();
          };
          const KL = 14 * u;
          // встромлені ножі (обертаються разом із колодою)
          for (const k of knives) {
            const a = th + k.a;
            g.save();
            g.translate(ar.cx + Math.cos(a) * (R - 3 * u), ar.cy + Math.sin(a) * (R - 3 * u));
            g.rotate(a);
            knife(KL, k.owner < 0 ? '#6B6489' : G.COLORS[k.owner].c);
            g.restore();
          }
          // колода
          g.beginPath();
          g.arc(ar.cx, ar.cy, R, 0, TAU);
          g.fillStyle = '#A8763E';
          g.fill();
          g.lineWidth = 1.2 * u;
          g.strokeStyle = '#6E4A22';
          g.stroke();
          g.strokeStyle = 'rgba(110,74,34,0.6)';
          for (let i = 1; i <= 3; i++) {
            g.beginPath();
            g.arc(ar.cx, ar.cy, (R * i) / 4, th, th + 5);
            g.stroke();
          }
          // польоти
          for (const k of fly) {
            const p = E.byId(k.owner);
            const s = launch(p), a = impact(p);
            const ex = ar.cx + Math.cos(a) * (R - 3 * u), ey = ar.cy + Math.sin(a) * (R - 3 * u);
            const f = Math.min(1, k.t / FLIGHT);
            let x = U.lerp(s.x, ex, f), y = U.lerp(s.y, ey, f), rot = a;
            if (k.bounce) {
              const bt2 = k.t - FLIGHT;
              x = ex + Math.cos(a) * bt2 * 40 * u + k.vx * bt2 * 30 * u;
              y = ey + Math.sin(a) * bt2 * 40 * u + bt2 * bt2 * 120 * u;
              rot = a + bt2 * 14;
            }
            g.save();
            g.translate(x, y);
            g.rotate(rot);
            knife(KL, p.color.c);
            g.restore();
          }
          // гравці: ніж напоготові
          for (const p of E.players) {
            const s = launch(p), a = impact(p);
            if (!E.out[p.id] && cd[p.id] <= 0 && left[p.id] > 0) {
              g.save();
              g.translate(s.x, s.y);
              g.rotate(a);
              knife(KL, p.color.c);
              g.restore();
            }
            E.hud(g, p, '🔪 ' + left[p.id], { color: p.color.l });
          }
        },
      };
    },
  });
})();
