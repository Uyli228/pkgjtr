(function () {
  const { U } = G;
  G.game({
    id: 'parking', name: 'Паркування', icon: '🚗', tag: 'Точність', bg: '#1C1B26', btn: 'ГАЗ', lanes: true,
    desc: 'Тримайте — машина розганяється, відпустіть — котиться й гальмує сама. Зупиніться якомога точніше в рамці. Удар об стіну — програш. Спроба одна!',
    create(E) {
      const ACC = 0.32, FR = 0.45, VMAX = 0.8, LIMIT = 15;
      const spot = U.rand(0.24, 0.42); // центр паркомісця (частка висоти від верху)
      const WALL = 0.09, CARH = 0.12;
      const S = {};
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { y: 0.86, v: 0, moved: false, st: 'drive', err: U.gauss() * U.lerp(0.14, 0.03, E.skill), startT: U.rand(0.2, 0.8) };
          }
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            if (s.st !== 'drive') continue;
            if (E.down[p.id]) {
              s.v = Math.min(VMAX, s.v + ACC * dt);
              s.moved = true;
            } else s.v = Math.max(0, s.v - FR * dt);
            s.y -= s.v * dt;
            if (s.y - CARH / 2 <= WALL) {
              s.y = WALL + CARH / 2;
              s.st = 'crash';
              s.v = 0;
              G.sfx('boom');
              E.shake(6);
              E.eliminate(p.id);
            } else if (s.moved && s.v <= 0) {
              s.st = 'park';
              G.sfx('stick');
            }
          }
          const finished = E.players.every((p) => S[p.id].st !== 'drive');
          if (finished || E.playT > LIMIT) {
            const d = {};
            for (const p of E.players) if (S[p.id].st === 'park') d[p.id] = Math.round(Math.abs(S[p.id].y - spot) * 1000);
            const w = E.best(d, 'min');
            E.finish(w, w.length ? `Відхилення: ${d[w[0]]} см` : 'Ніхто не запаркувався');
          }
        },
        bot(p) {
          const s = S[p.id];
          if (s.st !== 'drive') return;
          if (E.playT < s.startT) return;
          const remaining = s.y - spot;
          const stop = (s.v * s.v) / (2 * FR);
          s.presses = s.presses || 0;
          let want = E.down[p.id];
          if (E.down[p.id]) {
            if (stop + s.v * 0.05 >= remaining * (1 + s.err)) want = false;
          } else if (s.presses === 0) {
            want = true;
          } else if (s.presses === 1 && s.v < 0.15 && remaining - stop > 0.07 && Math.random() < E.skill) {
            // невелика корекція, якщо машина явно не докотиться
            want = true;
            s.err = U.gauss() * U.lerp(0.2, 0.05, E.skill);
          }
          if (want && !E.down[p.id]) s.presses++;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        label(p) {
          const s = S[p.id];
          return s.st === 'park' ? 'СТОП ✓' : s.st === 'crash' ? 'БАХ!' : null;
        },
        draw(g) {
          const fin = E.phase === 'result' || E.phase === 'done';
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              g.fillStyle = '#25232F';
              g.fillRect(0, 0, w, h);
              // розмітка
              g.fillStyle = 'rgba(255,255,255,0.2)';
              for (let y = 0.2; y < 1; y += 0.12) g.fillRect(w * 0.08, y * h, w * 0.025, h * 0.06);
              for (let y = 0.2; y < 1; y += 0.12) g.fillRect(w * 0.895, y * h, w * 0.025, h * 0.06);
              // стіна
              for (let i = 0; i < 8; i++) {
                g.fillStyle = i % 2 ? '#B8573C' : '#9C4530';
                g.fillRect((i * w) / 8, 0, w / 8 - 1, WALL * h * 0.5);
                g.fillStyle = i % 2 ? '#9C4530' : '#B8573C';
                g.fillRect((i * w) / 8 - w / 16, WALL * h * 0.5, w / 8 - 1, WALL * h * 0.5);
              }
              // паркомісце
              const sh = CARH * 1.25;
              g.strokeStyle = '#FFC530';
              g.lineWidth = 3;
              g.strokeRect(w * 0.3, (spot - sh / 2) * h, w * 0.4, sh * h);
              E.txt(g, 'P', w * 0.22, spot * h, Math.min(w, h) * 0.08, '#FFC530');
              // машина
              const cw = Math.min(w * 0.26, h * CARH * 0.62), chh = CARH * h;
              const x = w / 2 - cw / 2, y = (s.y - CARH / 2) * h;
              g.fillStyle = 'rgba(0,0,0,0.3)';
              U.rr(g, x + 3, y + 4, cw, chh, cw * 0.25);
              g.fill();
              g.fillStyle = s.st === 'crash' ? '#6B6489' : p.color.c;
              U.rr(g, x, y, cw, chh, cw * 0.25);
              g.fill();
              g.fillStyle = 'rgba(20,16,40,0.75)';
              U.rr(g, x + cw * 0.14, y + chh * 0.22, cw * 0.72, chh * 0.2, cw * 0.1);
              g.fill();
              U.rr(g, x + cw * 0.14, y + chh * 0.62, cw * 0.72, chh * 0.14, cw * 0.1);
              g.fill();
              g.fillStyle = '#FFF4C2';
              g.fillRect(x + cw * 0.1, y, cw * 0.2, chh * 0.05);
              g.fillRect(x + cw * 0.7, y, cw * 0.2, chh * 0.05);
              if (E.down[p.id] && s.st === 'drive') {
                g.fillStyle = 'rgba(200,200,220,0.35)';
                g.beginPath();
                g.arc(w / 2 + U.rand(-3, 3), y + chh + 8 + U.rand(0, 6), 5 + U.rand(0, 4), 0, Math.PI * 2);
                g.fill();
              }
              if (fin || s.st === 'crash') {
                const lbl = s.st === 'park' ? Math.round(Math.abs(s.y - spot) * 1000) + ' см' : s.st === 'crash' ? 'ВРІЗАВСЯ' : '—';
                E.txt(g, lbl, w / 2, h * 0.62, Math.min(w, h) * 0.09, '#fff', { stroke: 'rgba(0,0,0,0.6)' });
              }
            });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / LIMIT);
        },
      };
    },
  });
})();
