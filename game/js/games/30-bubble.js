(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'bubble', name: 'Спільна кулька', icon: '💨', tag: 'Нерви', bg: '#1A1840', btn: 'ДМУХ',
    verb: 'НЕ ЛУСНИ!',
    desc: 'Дмухай хоч раз на 3 секунди. Хто лусне кульку — вибув.',
    create(E) {
      const LIMIT = 3;
      const left = {}, bt = {};
      let size = 0.2, pop = 0.8, last = null, popT = 0;
      function newBalloon() {
        size = 0.2;
        pop = U.rand(0.55, 1);
        last = null;
        E.alive().forEach((p) => (left[p.id] = LIMIT));
      }
      return {
        init() {
          E.players.forEach((p) => (bt[p.id] = U.rand(0.4, 1.4)));
          newBalloon();
        },
        update(dt) {
          popT = Math.max(0, popT - dt);
          if (popT > 0) return;
          for (const p of E.alive()) {
            left[p.id] -= dt;
            if (left[p.id] <= 0) {
              const h = E.home(p, 13 * E.arena.u);
              E.float(h.x, h.y, 'ЗАСНУВ!', '#FF5468', p.rot);
              E.eliminate(p.id);
              if (E.lastStanding()) return;
            }
          }
        },
        bot(p) {
          if (popT > 0) return;
          const wobble = size > pop - 0.12;
          // бот дмухає, коли час підтискає, або коли кулька ще маленька
          if (left[p.id] < bt[p.id] || (!wobble && size < 0.45 && Math.random() < 0.01)) {
            E.tap(p.id);
            bt[p.id] = U.rand(0.25, 1.2) * U.lerp(1.2, 0.8, E.skill);
          }
        },
        press(p) {
          if (popT > 0) return;
          left[p.id] = LIMIT;
          last = p.id;
          size += U.rand(0.04, 0.075);
          G.sfx('pump', size);
          if (size >= pop) {
            popT = 1.3;
            G.sfx('pop');
            E.shake(8);
            const ar = E.arena;
            E.burst(ar.cx, ar.cy, [p.color.c, '#fff'], 40);
            E.eliminate(p.id);
            if (E.lastStanding()) return;
            E.after(1.3, newBalloon);
          }
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          if (popT <= 0) {
            const R = (8 + size * 26) * u;
            const near = U.clamp((size - (pop - 0.12)) / 0.12, 0, 1);
            const jx = U.rand(-1, 1) * near * 1.2 * u, jy = U.rand(-1, 1) * near * 1.2 * u;
            const col = last == null ? { c: '#C9C2EA', d: '#8D86B0' } : G.COLORS[last];
            g.fillStyle = col.c;
            g.beginPath();
            g.ellipse(ar.cx + jx, ar.cy + jy, R * 0.94, R, 0, 0, TAU);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath();
            g.ellipse(ar.cx - R * 0.35 + jx, ar.cy - R * 0.4 + jy, R * 0.16, R * 0.28, -0.5, 0, TAU);
            g.fill();
            g.fillStyle = col.d;
            g.beginPath();
            g.moveTo(ar.cx - R * 0.1, ar.cy + R * 1.02);
            g.lineTo(ar.cx + R * 0.1, ar.cy + R * 1.02);
            g.lineTo(ar.cx, ar.cy + R * 0.9);
            g.fill();
          }
          for (const p of E.players) {
            const h = E.home(p, 12 * u);
            const out = E.out[p.id];
            const f = out ? 0 : U.clamp(left[p.id] / LIMIT, 0, 1);
            if (!out) {
              g.strokeStyle = 'rgba(255,255,255,0.12)';
              g.lineWidth = 1.4 * u;
              g.beginPath();
              g.arc(h.x, h.y, 9 * u, 0, TAU);
              g.stroke();
              g.strokeStyle = f < 0.35 ? '#FF5468' : p.color.l;
              g.beginPath();
              g.arc(h.x, h.y, 9 * u, -Math.PI / 2, -Math.PI / 2 + TAU * f);
              g.stroke();
            }
            E.avatar(g, h.x, h.y, 6.5 * u, p, out ? 'out' : f < 0.35 ? 'scared' : 'idle', p.rot);
          }
        },
      };
    },
  });
})();
