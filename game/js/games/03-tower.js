(function () {
  const { U } = G;
  G.game({
    id: 'tower', name: 'Вежа', icon: '🏗️', tag: 'Точність', bg: '#141029', btn: 'КЛАЦ', lanes: true,
    verb: 'БУДУЙ ВИЩЕ!',
    desc: 'Тап — скинути блок. За 20 секунд найвища вежа виграє.',
    create(E) {
      const TIME = 20, BH = 1 / 13;
      const S = {};
      function slider(s) {
        const top = s.blocks[s.blocks.length - 1];
        const left = top.x + top.w / 2 > 0.5;
        s.sl = { x: left ? 0 : 1 - top.w, w: top.w, dir: left ? 1 : -1 };
        s.k = U.lerp(0.11, 0.04, E.skill) * U.rand(0.3, 1.3);
      }
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { blocks: [{ x: 0.2, w: 0.6 }], debris: [], sl: null, k: 0.05 };
            slider(S[p.id]);
          }
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            const v = 0.6 + s.blocks.length * 0.06;
            s.sl.x += s.sl.dir * v * dt;
            if (s.sl.x < 0) { s.sl.x = -s.sl.x; s.sl.dir = 1; }
            if (s.sl.x > 1 - s.sl.w) { s.sl.x = 2 * (1 - s.sl.w) - s.sl.x; s.sl.dir = -1; }
            for (const d of s.debris) {
              d.vy += 3 * dt;
              d.y -= d.vy * dt;
              d.r += d.vr * dt;
            }
            s.debris = s.debris.filter((d) => d.y > -8);
          }
          if (E.playT >= TIME) {
            const h = {};
            E.players.forEach((p) => (h[p.id] = S[p.id].blocks.length - 1));
            E.finish(E.best(h, 'max'), 'Поверхів: ' + Math.max(...Object.values(h)));
          }
        },
        bot(p) {
          const s = S[p.id], top = s.blocks[s.blocks.length - 1];
          const v = 0.6 + s.blocks.length * 0.06;
          if (Math.abs(s.sl.x - top.x) < s.k * v && Math.random() < 0.3) E.tap(p.id);
        },
        press(p) {
          const s = S[p.id], top = s.blocks[s.blocks.length - 1], sl = s.sl;
          const lvl = s.blocks.length;
          let x = sl.x;
          if (Math.abs(x - top.x) < 0.02) {
            x = top.x;
            G.sfx('coin');
            E.hitstop(0.04);
          } else G.sfx('thud');
          const l = Math.max(x, top.x), r = Math.min(x + sl.w, top.x + top.w);
          if (r - l <= 0.01) {
            // промах: блок падає, вежа лишається, ширина та сама
            s.debris.push({ x, w: sl.w, y: lvl, vy: 0, r: 0, vr: U.rand(-3, 3) });
            E.shake(3);
            slider(s);
            return;
          }
          if (x < l) s.debris.push({ x, w: l - x, y: lvl, vy: 0, r: 0, vr: -2.5 });
          if (x + sl.w > r) s.debris.push({ x: r, w: x + sl.w - r, y: lvl, vy: 0, r: 0, vr: 2.5 });
          s.blocks.push({ x: l, w: Math.max(0.06, r - l) });
          slider(s);
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const bh = h * BH;
              const shift = Math.max(0, s.blocks.length - 9);
              const base = h - bh * 0.4;
              const yOf = (k) => base - (k - shift + 1) * bh;
              g.fillStyle = U.shade(p.color.d, -0.6);
              g.fillRect(0, 0, w, h);
              E.txt(g, String(s.blocks.length - 1), w / 2, h * 0.28, Math.min(w, h) * 0.3, 'rgba(255,255,255,0.07)', { weight: 900 });
              const blk = (x, bw, y, a = 1) => {
                g.globalAlpha = a;
                g.fillStyle = p.color.d;
                g.fillRect(x * w, y + bh * 0.15, bw * w, bh * 0.85);
                g.fillStyle = p.color.c;
                g.fillRect(x * w, y, bw * w, bh * 0.8);
                g.fillStyle = 'rgba(255,255,255,0.25)';
                g.fillRect(x * w, y, bw * w, bh * 0.16);
                g.globalAlpha = 1;
              };
              s.blocks.forEach((b, k) => {
                const y = yOf(k);
                if (y < h + bh) blk(b.x, b.w, y);
              });
              blk(s.sl.x, s.sl.w, yOf(s.blocks.length), E.phase === 'play' ? 1 : 0.5);
              for (const d of s.debris) {
                g.save();
                g.translate((d.x + d.w / 2) * w, yOf(d.y) + bh / 2);
                g.rotate(d.r);
                g.fillStyle = U.shade(p.color.c, -0.25);
                g.fillRect((-d.w / 2) * w, -bh * 0.4, d.w * w, bh * 0.8);
                g.restore();
              }
            });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
