(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'fruits', name: 'Фруктики', icon: '🍉', tag: 'Збирай', bg: '#1E3324', btn: 'РУХ', input: 'stick',
    verb: 'ЗБИРАЙ!',
    desc: 'Джойстиком збирай фрукти, обходь бомби. 25 секунд.',
    create(E) {
      const TIME = 25, FR = ['🍎', '🍌', '🍊', '🍇', '🍓', '🍐'];
      const S = {};
      let items = [], spawnT = 0;
      const R = () => 4.5 * E.arena.u;
      function spawn() {
        const ar = E.arena;
        const bomb = Math.random() < 0.18;
        items.push({ x: ar.x + U.rand(0.08, 0.92) * ar.w, y: ar.y + U.rand(0.08, 0.92) * ar.h, bomb, ch: bomb ? '💣' : U.pick(FR), t: 0 });
      }
      return {
        init() {
          for (const p of E.players) {
            const h = E.home(p, 16 * E.arena.u);
            S[p.id] = { x: h.x, y: h.y, sc: 0, stun: 0 };
          }
          for (let i = 0; i < 6; i++) spawn();
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = R();
          spawnT -= dt;
          if (spawnT <= 0 && items.length < 10) {
            spawn();
            spawnT = 0.5;
          }
          for (const it of items) it.t += dt;
          for (const p of E.players) {
            const s = S[p.id];
            s.stun = Math.max(0, s.stun - dt);
            const st = E.stick[p.id];
            const sp = s.stun > 0 ? 0 : 42 * u;
            s.x = U.clamp(s.x + st.x * sp * dt, ar.x + r, ar.x + ar.w - r);
            s.y = U.clamp(s.y + st.y * sp * dt, ar.y + r, ar.y + ar.h - r);
            for (let i = items.length - 1; i >= 0; i--) {
              const it = items[i];
              if (U.dist(s.x, s.y, it.x, it.y) < r + 3 * u) {
                items.splice(i, 1);
                if (it.bomb) {
                  s.sc = Math.max(0, s.sc - 2);
                  s.stun = 1;
                  E.burst(it.x, it.y, ['#FF5468', '#FFC530'], 20);
                  E.shake(5);
                  E.float(it.x, it.y, '−2', '#FF5468', p.rot);
                } else {
                  s.sc++;
                  G.sfx('coin');
                  E.float(it.x, it.y, '+1', p.color.l, p.rot);
                }
              }
            }
          }
          if (E.playT >= TIME) {
            const v = {};
            E.players.forEach((p) => (v[p.id] = S[p.id].sc));
            E.finish(E.best(v, 'max'), 'Фруктів: ' + Math.max(...Object.values(v)));
          }
        },
        bot(p) {
          const s = S[p.id], u = E.arena.u;
          let best = null, bd = Infinity;
          for (const it of items) {
            if (it.bomb) continue;
            const d = U.dist(s.x, s.y, it.x, it.y) * U.rand(0.9, 1.1);
            if (d < bd) { bd = d; best = it; }
          }
          if (!best) return E.setStick(p.id, 0, 0);
          let dx = best.x - s.x, dy = best.y - s.y;
          for (const it of items) {
            if (!it.bomb) continue;
            const d = U.dist(s.x, s.y, it.x, it.y);
            if (d < 12 * u && Math.random() < 0.4 + E.skill * 0.6) {
              dx += ((s.x - it.x) / d) * 30 * u;
              dy += ((s.y - it.y) / d) * 30 * u;
            }
          }
          const l = Math.hypot(dx, dy) || 1;
          const k = U.lerp(0.65, 1, E.skill);
          E.setStick(p.id, (dx / l) * k, (dy / l) * k);
        },
        draw(g) {
          const u = E.arena.u;
          for (const it of items) {
            const pop = Math.min(1, it.t / 0.2);
            E.emoji(g, it.ch, it.x, it.y + Math.sin(E.t * 3 + it.x) * 0.6 * u, 8 * u * pop);
          }
          for (const p of E.players) {
            const s = S[p.id];
            E.avatar(g, s.x, s.y, R(), p, s.stun > 0 ? 'hurt' : 'happy');
            E.hud(g, p, String(s.sc), { color: p.color.l, size: 5 * u });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
