(function () {
  const { U } = G;
  G.game({
    id: 'tower', name: 'Вежа', icon: '🧱', tag: 'Точність', bg: '#141029', btn: 'КЛАЦ', lanes: true,
    desc: 'Блок їздить туди-сюди. Тисніть, щоб скинути його на вежу — усе, що звисає, відпадає. Хто перший збудує 10 поверхів?',
    create(E) {
      const GOAL = 10;
      const S = {};
      function newSlider(s) {
        const top = s.blocks[s.blocks.length - 1];
        // з того боку, що далі від вежі
        const fromLeft = top.x + top.w / 2 > 0.5;
        s.slider = { x: fromLeft ? 0 : 1 - top.w, w: top.w, dir: fromLeft ? 1 : -1 };
        s.wait = 0.32;
        s.botTol = U.lerp(0.085, 0.012, E.skill) * U.rand(0.4, 1.3);
        if (Math.random() < (1 - E.skill) * 0.12) s.botTol = 0.22;
      }
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { blocks: [{ x: 0.19, w: 0.62 }], debris: [], slider: null, msg: null, msgT: 0 };
            newSlider(S[p.id]);
          }
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            s.msgT = Math.max(0, s.msgT - dt);
            for (const d of s.debris) {
              d.vy += 3.2 * dt;
              d.y -= d.vy * dt;
              d.rot += d.vr * dt;
            }
            s.debris = s.debris.filter((d) => d.y > -4);
            if (E.out[p.id] || !s.slider) continue;
            if (s.wait > 0) {
              s.wait -= dt;
              continue;
            }
            const lvl = s.blocks.length - 1;
            const v = 0.55 + lvl * 0.075;
            const sl = s.slider;
            sl.x += sl.dir * v * dt;
            if (sl.x < 0) { sl.x = -sl.x; sl.dir = 1; }
            if (sl.x > 1 - sl.w) { sl.x = 2 * (1 - sl.w) - sl.x; sl.dir = -1; }
          }
          if (E.alive().length === 0) {
            const lv = {};
            E.players.forEach((p) => (lv[p.id] = S[p.id].blocks.length - 1));
            E.finish(E.best(lv, 'max'), 'Усі вежі впали');
          }
        },
        bot(p) {
          const s = S[p.id];
          if (!s.slider || s.wait > 0) return;
          const top = s.blocks[s.blocks.length - 1];
          if (Math.abs(s.slider.x - top.x) < s.botTol && Math.random() < 0.3) E.tap(p.id);
        },
        press(p) {
          const s = S[p.id];
          const sl = s.slider;
          if (!sl || s.wait > 0) return;
          const top = s.blocks[s.blocks.length - 1];
          const lvl = s.blocks.length;
          let x = sl.x, w = sl.w;
          if (Math.abs(x - top.x) < 0.018) {
            x = top.x;
            s.msg = 'ІДЕАЛЬНО!';
            s.msgT = 0.8;
            G.sfx('coin');
          } else G.sfx('thud');
          const l = Math.max(x, top.x), r = Math.min(x + w, top.x + top.w);
          if (r - l <= 0.004) {
            s.debris.push({ x, w, y: lvl, vy: 0, rot: 0, vr: U.rand(-3, 3) });
            s.slider = null;
            E.eliminate(p.id);
            E.lastStanding();
            return;
          }
          if (x < l) s.debris.push({ x, w: l - x, y: lvl, vy: 0, rot: 0, vr: -2.5 });
          if (x + w > r) s.debris.push({ x: r, w: x + w - r, y: lvl, vy: 0, rot: 0, vr: 2.5 });
          s.blocks.push({ x: l, w: r - l });
          if (s.blocks.length - 1 >= GOAL) {
            s.slider = null;
            E.finish([p.id]);
            return;
          }
          newSlider(s);
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const bh = h / 14.2;
              const base = h - bh * 0.6;
              const gr = g.createLinearGradient(0, 0, 0, h);
              gr.addColorStop(0, '#120E26');
              gr.addColorStop(1, U.shade(p.color.d, -0.55));
              g.fillStyle = gr;
              g.fillRect(0, 0, w, h);
              // номер поверху
              E.txt(g, String(s.blocks.length - 1), w / 2, h * 0.3, Math.min(w, h) * 0.34, 'rgba(255,255,255,0.05)', { weight: 900 });
              // фініш
              const gy = base - bh * (GOAL + 1);
              g.strokeStyle = 'rgba(255,255,255,0.45)';
              g.setLineDash([6, 5]);
              g.lineWidth = 2;
              g.beginPath();
              g.moveTo(0, gy);
              g.lineTo(w, gy);
              g.stroke();
              g.setLineDash([]);
              E.emoji(g, '🏁', w - 14, gy - 10, 16);
              const blk = (x, bw, k, a = 1) => {
                const y = base - bh * (k + 1);
                g.globalAlpha = a;
                g.fillStyle = p.color.d;
                g.fillRect(x * w, y + bh * 0.18, bw * w, bh * 0.82);
                g.fillStyle = p.color.c;
                g.fillRect(x * w, y, bw * w, bh * 0.8);
                g.fillStyle = 'rgba(255,255,255,0.25)';
                g.fillRect(x * w, y, bw * w, bh * 0.18);
                g.globalAlpha = 1;
              };
              s.blocks.forEach((b, k) => blk(b.x, b.w, k));
              if (s.slider && !E.out[p.id] && !(s.wait > 0)) blk(s.slider.x, s.slider.w, s.blocks.length, E.phase === 'play' ? 1 : 0.6);
              for (const d of s.debris) {
                g.save();
                const y = base - bh * (d.y + 1);
                g.translate((d.x + d.w / 2) * w, y + bh / 2);
                g.rotate(d.rot);
                g.fillStyle = U.shade(p.color.c, -0.2);
                g.fillRect((-d.w / 2) * w, -bh * 0.4, d.w * w, bh * 0.8);
                g.restore();
              }
              if (s.msgT > 0) E.txt(g, s.msg, w / 2, h * 0.12, Math.min(w * 0.09, 20), '#FFE7A3', { stroke: 'rgba(0,0,0,0.5)' });
              if (E.out[p.id]) E.outPanel(g, w, h, 'ВЕЖА ВПАЛА');
            });
          }
        },
      };
    },
  });
})();
