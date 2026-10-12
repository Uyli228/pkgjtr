(function () {
  const { U } = G;
  G.game({
    id: 'ninja', name: 'Ніндзя', icon: '🥷', tag: 'Виживання', bg: '#1A1A2E', btn: 'СТРИБОК', lanes: true,
    verb: 'ПЕРЕСКАКУЙ!',
    desc: 'Тап — стрибок на іншу стіну. Не наштовхнись на шипи.',
    create(E) {
      const JUMP = 0.28, NY = 0.75;
      const r = U.rng((Math.random() * 1e9) | 0);
      const spikes = [];
      for (let z = 1.2; z < 300; z += r.range(0.3, 0.6)) spikes.push({ z, side: r() < 0.5 ? 0 : 1, len: r.range(0.08, 0.14) });
      const S = {};
      let z = 0;
      return {
        init() {
          for (const p of E.players) S[p.id] = { side: 0, tr: 0, plan: {} };
        },
        update(dt) {
          const speed = 0.4 + E.playT * 0.03;
          z += speed * dt;
          const dead = [];
          for (const p of E.alive()) {
            const s = S[p.id];
            if (s.tr > 0) {
              s.tr = Math.max(0, s.tr - dt / JUMP);
              continue;
            }
            for (const sp of spikes) {
              if (sp.z > z + 0.05) break;
              if (sp.side === s.side && z >= sp.z - 0.02 && z <= sp.z + sp.len) {
                dead.push(p.id);
                break;
              }
            }
          }
          for (const id of dead) {
            const p = E.byId(id), P = p.panel;
            E.burst(P.x + P.w / 2, P.y + P.h / 2, p.color.c, 20);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
          if (E.playT > 90 && E.phase === 'play') E.finish(E.alive().map((q) => q.id));
        },
        bot(p) {
          const s = S[p.id];
          if (s.tr > 0) return;
          const speed = 0.4 + E.playT * 0.03;
          const next = spikes.find((sp) => sp.z + sp.len > z && sp.side === s.side);
          if (!next) return;
          if (s.plan[next.z] == null) s.plan[next.z] = U.rand(0.12, 0.35) + U.gauss() * U.lerp(0.16, 0.06, E.skill);
          if ((next.z - z) / speed < s.plan[next.z]) {
            // стрибаємо, лише якщо на іншій стіні чисто
            const other = spikes.find((sp) => sp.side !== s.side && sp.z + sp.len > z && sp.z < z + speed * JUMP + 0.05);
            if (!other || Math.random() < (1 - E.skill) * 0.3) E.tap(p.id);
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.tr > 0) return;
          s.side = 1 - s.side;
          s.tr = 1;
          G.sfx('jump');
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h), wall = w * 0.14;
              g.fillStyle = '#20203A';
              g.fillRect(0, 0, w, h);
              g.fillStyle = '#3A3A5E';
              g.fillRect(0, 0, wall, h);
              g.fillRect(w - wall, 0, wall, h);
              const yOf = (zz) => h * NY - (zz - z) * h;
              for (const sp of spikes) {
                const y1 = yOf(sp.z + sp.len), y0 = yOf(sp.z);
                if (y0 < -10) break;
                if (y1 > h + 10) continue;
                const x = sp.side ? w - wall : wall;
                const dir = sp.side ? -1 : 1;
                g.fillStyle = '#FF5468';
                g.beginPath();
                const n = 3;
                for (let i = 0; i < n; i++) {
                  const a = y1 + ((y0 - y1) * i) / n, b = y1 + ((y0 - y1) * (i + 1)) / n;
                  g.moveTo(x, a);
                  g.lineTo(x + dir * m * 0.07, (a + b) / 2);
                  g.lineTo(x, b);
                }
                g.fill();
              }
              const from = s.tr > 0 ? 1 - s.side : s.side;
              const k = 1 - s.tr;
              const xs = (side) => (side ? w - wall - m * 0.06 : wall + m * 0.06);
              const x = U.lerp(xs(from), xs(s.side), s.tr > 0 ? k : 1);
              const y = h * NY - (s.tr > 0 ? Math.sin(k * Math.PI) * m * 0.06 : 0);
              if (!E.out[p.id]) {
                E.avatar(g, x, y, m * 0.055, p, s.tr > 0 ? 'happy' : 'sly');
                g.fillStyle = '#1A1233';
                g.fillRect(x - m * 0.055, y - m * 0.03, m * 0.11, m * 0.022);
              }
              E.txt(g, Math.floor(z * 10) + ' м', w / 2, 14, m * 0.05, 'rgba(255,255,255,0.5)');
              if (E.out[p.id]) E.outPanel(g, w, h, 'НА ШИПАХ');
            });
          }
        },
      };
    },
  });
})();
