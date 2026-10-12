(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'cake', name: 'Чий торт?', icon: '🎂', tag: 'Помста', bg: '#2A1C2E', btn: 'ПУСК',
    desc: 'Катапульта з тортом крутиться в центрі. У кожного ОДИН постріл за раунд — натисни, коли вона дивиться на жертву. Торт у лідера — +2, у будь-кого — +1, в останнього — 0, у себе — мінус 1. П’ять раундів.',
    create(E) {
      const ROUNDS = 5, WINDOW = 7;
      const sc = {}, shot = {}, cream = {}, bt = {};
      let a = 0, w = 2, wT = 0, round = 0, rt = 0, pause = 0, cakes = [];
      const seatA = (p) => Math.atan2(p.ay - E.arena.cy, p.ax - E.arena.cx);
      const half = () => (E.n >= 3 ? 0.42 : 0.7);
      function targetAt(dir) {
        let best = null, bd = half();
        for (const p of E.players) {
          const d = Math.abs(U.angDiff(dir, seatA(p)));
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        return best;
      }
      function newRound() {
        round++;
        rt = 0;
        E.players.forEach((p) => {
          shot[p.id] = false;
          bt[p.id] = U.rand(0.6, 2.2);
        });
      }
      function fire(p) {
        shot[p.id] = true;
        const q = targetAt(a);
        cakes.push({ from: p.id, to: q ? q.id : null, dir: a, t: 0 });
        G.sfx('whoosh');
      }
      function land(c) {
        const ar = E.arena, u = ar.u;
        const p = E.byId(c.from);
        if (c.to == null) {
          E.burst(ar.cx + Math.cos(c.dir) * ar.w * 0.45, ar.cy + Math.sin(c.dir) * ar.h * 0.4, ['#FFF8EA', '#FF9ECF'], 14);
          return;
        }
        const q = E.byId(c.to), hp = E.home(q, 13 * u);
        const vals = E.players.map((o) => sc[o.id]);
        const max = Math.max(...vals), min = Math.min(...vals);
        let pts;
        if (q.id === p.id) pts = -1;
        else if (sc[q.id] === max && max > min) pts = 2;
        else if (sc[q.id] === min && max > min) pts = 0;
        else pts = 1;
        sc[p.id] += pts;
        cream[q.id] = 3;
        G.sfx(q.id === p.id ? 'bad' : 'pop');
        E.shake(4);
        E.burst(hp.x, hp.y, ['#FFF8EA', '#FF9ECF', '#7A3E1E'], 30);
        const pp = E.home(p, 13 * u);
        E.float(pp.x, pp.y, (pts > 0 ? '+' : pts < 0 ? '−' : '') + Math.abs(pts), pts > 0 ? p.color.l : '#FF5468', p.rot);
      }
      return {
        init() {
          E.players.forEach((p) => {
            sc[p.id] = 0;
            cream[p.id] = 0;
          });
          newRound();
        },
        update(dt) {
          wT -= dt;
          if (wT <= 0) {
            wT = U.rand(1, 2.6);
            w = (Math.random() < 0.3 ? -Math.sign(w) : Math.sign(w)) * U.rand(1.6, 3);
          }
          a += w * dt;
          for (const p of E.players) cream[p.id] = Math.max(0, cream[p.id] - dt);
          for (const c of cakes) {
            c.t += dt / 0.4;
            if (c.t >= 1 && !c.done) {
              c.done = true;
              land(c);
            }
          }
          cakes = cakes.filter((c) => c.t < 1.2);
          if (pause > 0) {
            pause -= dt;
            if (pause <= 0) {
              if (round >= ROUNDS) return E.finish(E.best(sc, 'max'), 'Рахунок: ' + Math.max(...E.players.map((p) => sc[p.id])));
              newRound();
            }
            return;
          }
          rt += dt;
          if (rt > WINDOW) for (const p of E.players) if (!shot[p.id]) fire(p);
          if (E.players.every((p) => shot[p.id]) && !cakes.some((c) => !c.done)) pause = 1;
        },
        bot(p, dt) {
          if (shot[p.id] || pause > 0) return;
          bt[p.id] -= dt;
          if (bt[p.id] > 0) return;
          const err = U.gauss() * U.lerp(0.35, 0.08, E.skill);
          const q = targetAt(a + w * 0.15 + err);
          if (!q || q.id === p.id) return;
          const others = E.players.filter((o) => o.id !== p.id);
          const max = Math.max(...others.map((o) => sc[o.id]));
          const hurry = rt > WINDOW - 2;
          if (sc[q.id] === max || hurry || Math.random() < 0.02) E.tap(p.id);
        },
        press(p) {
          if (shot[p.id] || pause > 0) return;
          fire(p);
        },
        label(p) {
          return shot[p.id] ? 'ЧЕКАЙ' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // сектори гравців
          for (const p of E.players) {
            const sa = seatA(p);
            g.fillStyle = U.alpha(p.color.c, 0.12);
            g.beginPath();
            g.moveTo(ar.cx, ar.cy);
            g.arc(ar.cx, ar.cy, ar.h, sa - half(), sa + half());
            g.closePath();
            g.fill();
          }
          // катапульта
          g.fillStyle = '#5A3A28';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 9 * u, 0, TAU);
          g.fill();
          g.save();
          g.translate(ar.cx, ar.cy);
          g.rotate(a);
          g.fillStyle = '#8A5A3C';
          g.fillRect(0, -1.6 * u, 22 * u, 3.2 * u);
          g.restore();
          const hasCake = E.players.some((p) => !shot[p.id]) && pause <= 0;
          if (hasCake) E.emoji(g, '🎂', ar.cx + Math.cos(a) * 22 * u, ar.cy + Math.sin(a) * 22 * u, 9 * u);
          // торти в польоті
          for (const c of cakes) {
            if (c.done) continue;
            let tx, ty;
            if (c.to != null) {
              const hp = E.home(E.byId(c.to), 13 * u);
              tx = hp.x;
              ty = hp.y;
            } else {
              tx = ar.cx + Math.cos(c.dir) * ar.w * 0.45;
              ty = ar.cy + Math.sin(c.dir) * ar.h * 0.4;
            }
            const k = U.outCubic(c.t);
            E.emoji(g, '🎂', U.lerp(ar.cx, tx, k), U.lerp(ar.cy, ty, k) - Math.sin(k * Math.PI) * 10 * u, 9 * u * (1 + Math.sin(k * Math.PI) * 0.5), c.t * 8);
          }
          for (const p of E.players) {
            const hp = E.home(p, 13 * u);
            g.fillStyle = p.color.c;
            g.beginPath();
            g.arc(hp.x, hp.y, 7 * u, 0, TAU);
            g.fill();
            E.emoji(g, cream[p.id] > 0 ? '😵' : shot[p.id] ? '😏' : '😬', hp.x, hp.y, 8 * u, p.rot);
            if (cream[p.id] > 0) {
              g.globalAlpha = Math.min(1, cream[p.id]);
              g.fillStyle = '#FFF8EA';
              for (let i = 0; i < 7; i++) {
                const an = i * 0.9 + p.seat;
                g.beginPath();
                g.arc(hp.x + Math.cos(an) * 6 * u, hp.y + Math.sin(an) * 6 * u, (2.4 + (i % 3)) * u, 0, TAU);
                g.fill();
              }
              g.globalAlpha = 1;
            }
            E.hud(g, p, String(sc[p.id]), { color: p.color.l, size: 5 * u });
          }
          E.dual(g, (x, y) => E.txt(g, `РАУНД ${Math.min(round, ROUNDS)}/${ROUNDS}`, x, y, 3.2 * u, 'rgba(246,241,255,0.55)', { body: true, weight: 800 }), 30 * u, true);
        },
      };
    },
  });
})();
