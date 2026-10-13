(function () {
  const { U } = G;
  G.game({
    id: 'paint', name: 'Фарба', icon: '🎨', tag: 'Територія', bg: '#2A2440', btn: 'РУХ', input: 'stick',
    verb: 'ФАРБУЙ!',
    desc: 'Джойстиком фарбуй підлогу. Через 20 секунд — у кого більше.',
    create(E) {
      const TIME = 20, CW = 22, CH = 12;
      const S = {};
      let cells = [];
      const R = () => 5 * E.arena.u;
      const cw = () => E.arena.w / CW, ch = () => E.arena.h / CH;
      function count() {
        const c = {};
        for (const p of E.players) c[p.id] = 0;
        for (const v of cells) if (v >= 0) c[v]++;
        return c;
      }
      return {
        init() {
          cells = new Array(CW * CH).fill(-1);
          for (const p of E.players) {
            const h = E.home(p, 14 * E.arena.u);
            S[p.id] = { x: h.x, y: h.y, tx: null, ty: null, re: 0 };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = R();
          for (const p of E.players) {
            const s = S[p.id], st = E.stick[p.id];
            s.x = U.clamp(s.x + st.x * 46 * u * dt, ar.x + r, ar.x + ar.w - r);
            s.y = U.clamp(s.y + st.y * 46 * u * dt, ar.y + r, ar.y + ar.h - r);
            // фарбуємо клітинки під пензлем
            const i0 = Math.floor((s.x - r - ar.x) / cw()), i1 = Math.floor((s.x + r - ar.x) / cw());
            const j0 = Math.floor((s.y - r - ar.y) / ch()), j1 = Math.floor((s.y + r - ar.y) / ch());
            for (let i = Math.max(0, i0); i <= Math.min(CW - 1, i1); i++)
              for (let j = Math.max(0, j0); j <= Math.min(CH - 1, j1); j++) {
                const cx = ar.x + (i + 0.5) * cw(), cy = ar.y + (j + 0.5) * ch();
                if (U.dist(cx, cy, s.x, s.y) < r * 1.05) cells[j * CW + i] = p.id;
              }
          }
          if (E.playT >= TIME) {
            const c = count();
            E.finish(E.best(c, 'max'), Math.round((Math.max(...Object.values(c)) / cells.length) * 100) + '% підлоги');
          }
        },
        bot(p, dt) {
          const s = S[p.id], ar = E.arena;
          s.re -= dt;
          if (s.tx == null || s.re <= 0 || U.dist(s.x, s.y, s.tx, s.ty) < 4 * ar.u) {
            // найближча чужа клітинка (з випадковістю)
            let best = null, bd = Infinity;
            for (let k = 0; k < 40; k++) {
              const i = U.randi(0, CW - 1), j = U.randi(0, CH - 1);
              if (cells[j * CW + i] === p.id) continue;
              const x = ar.x + (i + 0.5) * cw(), y = ar.y + (j + 0.5) * ch();
              const d = U.dist(s.x, s.y, x, y) * U.rand(0.8, 1.2);
              if (d < bd) { bd = d; best = { x, y }; }
            }
            if (best) { s.tx = best.x; s.ty = best.y; }
            s.re = U.rand(0.6, 1.4);
          }
          const dx = s.tx - s.x, dy = s.ty - s.y, l = Math.hypot(dx, dy) || 1;
          const k = U.lerp(0.6, 1, E.skill);
          E.setStick(p.id, (dx / l) * k, (dy / l) * k);
        },
        draw(g) {
          const ar = E.arena, u = ar.u, w = cw(), h = ch();
          for (let j = 0; j < CH; j++)
            for (let i = 0; i < CW; i++) {
              const v = cells[j * CW + i];
              g.fillStyle = v >= 0 ? G.COLORS[v].c : (i + j) % 2 ? '#2F2848' : '#2A2440';
              g.fillRect(ar.x + i * w, ar.y + j * h, w + 0.5, h + 0.5);
            }
          const c = count();
          for (const p of E.players) {
            const s = S[p.id];
            E.avatar(g, s.x, s.y, R(), p, 'happy');
            E.hud(g, p, Math.round((c[p.id] / cells.length) * 100) + '%', { color: p.color.l, size: 4.5 * u });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
