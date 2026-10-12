(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'skill', name: 'Скілчек', icon: '🎯', tag: 'Точність', bg: '#141029', btn: 'ТАП', lanes: true,
    verb: 'ПОПАДИ В ЗОНУ!',
    desc: 'Тап, коли стрілка в зоні. Щоразу швидше. Промах — вибув.',
    create(E) {
      const S = {};
      function newZone(s) {
        s.zone = s.a + U.rand(1.6, 4.4);
        s.zw = Math.max(0.28, 0.75 - s.hits * 0.035);
        s.botErr = U.gauss() * U.lerp(0.25, 0.07, E.skill);
      }
      return {
        init() {
          for (const p of E.players) {
            const s = (S[p.id] = { a: -Math.PI / 2, hits: 0, flash: 0 });
            newZone(s);
          }
        },
        update(dt) {
          const dead = [];
          for (const p of E.alive()) {
            const s = S[p.id];
            s.flash = Math.max(0, s.flash - dt * 3);
            s.a += (2.4 + s.hits * 0.28) * dt;
            // проґавив зону зовсім — теж промах
            if (s.a > s.zone + s.zw / 2 + 0.05) dead.push(p.id);
          }
          for (const id of dead) E.eliminate(id);
          if (dead.length) E.lastStanding(dead);
          if (E.playT > 90 && E.phase === 'play') {
            const h = {};
            E.alive().forEach((p) => (h[p.id] = S[p.id].hits));
            E.finish(E.best(h, 'max'));
          }
        },
        bot(p) {
          const s = S[p.id];
          if (s.a >= s.zone + s.botErr * s.zw) E.tap(p.id);
        },
        press(p) {
          const s = S[p.id];
          if (Math.abs(s.a - s.zone) <= s.zw / 2) {
            s.hits++;
            s.flash = 1;
            G.sfx('coin');
            newZone(s);
          } else {
            E.eliminate(p.id);
            E.lastStanding([p.id]);
          }
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h * 0.85);
              g.fillStyle = U.shade(p.color.d, -0.65);
              g.fillRect(0, 0, w, h);
              const cx = w / 2, cy = h * 0.5, R = m * 0.32;
              g.lineWidth = m * 0.05;
              g.strokeStyle = 'rgba(255,255,255,0.12)';
              g.beginPath();
              g.arc(cx, cy, R, 0, TAU);
              g.stroke();
              g.strokeStyle = s.flash > 0 ? '#fff' : p.color.c;
              g.beginPath();
              g.arc(cx, cy, R, s.zone - s.zw / 2, s.zone + s.zw / 2);
              g.stroke();
              g.strokeStyle = '#fff';
              g.lineWidth = m * 0.02;
              g.lineCap = 'round';
              g.beginPath();
              g.moveTo(cx + Math.cos(s.a) * R * 0.55, cy + Math.sin(s.a) * R * 0.55);
              g.lineTo(cx + Math.cos(s.a) * R * 1.15, cy + Math.sin(s.a) * R * 1.15);
              g.stroke();
              g.lineCap = 'butt';
              E.txt(g, String(s.hits), cx, cy, m * 0.16, '#fff', { weight: 900 });
              if (E.out[p.id]) E.outPanel(g, w, h, 'ПРОМАХ');
            });
          }
        },
      };
    },
  });
})();
