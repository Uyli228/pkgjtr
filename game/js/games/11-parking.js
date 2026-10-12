(function () {
  const { U } = G;
  G.game({
    id: 'parking', name: 'Паркування', icon: '🚗', tag: 'Точність', bg: '#1C1B26', btn: 'ГАЗ', lanes: true,
    verb: 'СТОП У РАМЦІ',
    desc: 'Тримай — газ. Зупинись у рамці. До 2 перемог із 3.',
    create(E) {
      const ACC = 0.32, FR = 0.45, VMAX = 0.8, LIMIT = 13, WALL = 0.09, CARH = 0.12, WINS = 2;
      const S = {}, wins = {};
      let spot = 0.3, st = 'drive', t = 0, rWin = [];
      function newRound() {
        spot = U.rand(0.24, 0.42);
        st = 'drive';
        t = 0;
        rWin = [];
        for (const p of E.players) S[p.id] = { y: 0.86, v: 0, moved: false, st: 'drive', err: U.gauss() * U.lerp(0.14, 0.03, E.skill), startT: U.rand(0.2, 0.8), presses: 0 };
      }
      return {
        init() {
          E.players.forEach((p) => (wins[p.id] = 0));
          newRound();
        },
        update(dt) {
          t += dt;
          if (st === 'show') {
            if (t > 1.6) {
              const champ = E.players.find((p) => wins[p.id] >= WINS);
              if (champ) return E.finish([champ.id], 'Рахунок ' + E.players.map((p) => wins[p.id]).join(':'));
              newRound();
            }
            return;
          }
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
              G.sfx('boom');
              E.shake(6);
              E.flash('#FF5468', 0.6);
            } else if (s.moved && s.v <= 0) s.st = 'park';
          }
          if (E.players.every((p) => S[p.id].st !== 'drive') || t > LIMIT) {
            const d = {};
            for (const p of E.players) if (S[p.id].st === 'park') d[p.id] = Math.round(Math.abs(S[p.id].y - spot) * 1000);
            rWin = E.best(d, 'min');
            if (rWin.length === 1) {
              wins[rWin[0]]++;
              G.sfx('point');
            }
            st = 'show';
            t = 0;
          }
        },
        bot(p) {
          const s = S[p.id];
          if (s.st !== 'drive' || t < s.startT) return;
          const remaining = s.y - spot, stop = (s.v * s.v) / (2 * FR);
          let want = E.down[p.id];
          if (E.down[p.id]) {
            if (stop + s.v * 0.05 >= remaining * (1 + s.err)) want = false;
          } else if (s.presses === 0) want = true;
          if (want && !E.down[p.id]) s.presses++;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        label(p) {
          const s = S[p.id];
          return s.st === 'park' ? 'СТОП ✓' : s.st === 'crash' ? 'БАХ!' : null;
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              g.fillStyle = '#25232F';
              g.fillRect(0, 0, w, h);
              for (let i = 0; i < 8; i++) {
                g.fillStyle = i % 2 ? '#B8573C' : '#9C4530';
                g.fillRect((i * w) / 8, 0, w / 8 - 1, WALL * h);
              }
              const sh = CARH * 1.25;
              const won = st === 'show' && rWin.length === 1 && rWin[0] === p.id;
              g.strokeStyle = won ? '#35D486' : '#FFC530';
              g.lineWidth = 3;
              g.strokeRect(w * 0.3, (spot - sh / 2) * h, w * 0.4, sh * h);
              E.txt(g, 'P', w * 0.22, spot * h, Math.min(w, h) * 0.08, '#FFC530');
              const cw = Math.min(w * 0.26, h * CARH * 0.62), chh = CARH * h;
              const x = w / 2 - cw / 2, y = (s.y - CARH / 2) * h;
              g.fillStyle = s.st === 'crash' ? '#6B6489' : p.color.c;
              U.rr(g, x, y, cw, chh, cw * 0.25);
              g.fill();
              g.fillStyle = 'rgba(20,16,40,0.75)';
              U.rr(g, x + cw * 0.14, y + chh * 0.22, cw * 0.72, chh * 0.2, cw * 0.1);
              g.fill();
              g.fillStyle = '#FFF4C2';
              g.fillRect(x + cw * 0.1, y, cw * 0.2, chh * 0.05);
              g.fillRect(x + cw * 0.7, y, cw * 0.2, chh * 0.05);
              // перемоги — кружечки знизу
              for (let i = 0; i < WINS; i++) {
                g.beginPath();
                g.arc(w / 2 + (i - (WINS - 1) / 2) * 18, h - 14, 6, 0, Math.PI * 2);
                g.fillStyle = i < wins[p.id] ? p.color.c : 'rgba(255,255,255,0.15)';
                g.fill();
              }
              if (won) E.txt(g, '✓', w / 2, h * 0.62, Math.min(w, h) * 0.15, '#35D486', { stroke: 'rgba(0,0,0,0.5)' });
            });
          }
        },
      };
    },
  });
})();
