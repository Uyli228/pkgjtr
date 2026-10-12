(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'lastsec', name: 'Остання секунда', icon: '⏳', tag: 'Нерви', bg: '#1A1433', btn: 'СТОП',
    desc: 'Спільний таймер біжить до нуля. У кожного ОДИН натиск за раунд: чим пізніше — тим більше очок. Але твій натиск скидає таймер для всіх! Хто не натиснув до нуля — мінус 5. Чотири раунди.',
    create(E) {
      const ROUNDS = 4, T0 = 5;
      const sc = {}, done = {}, thr = {};
      let round = 0, T = T0, st = 'run', pause = 0, flash = 0, boomT = 0;
      function threshold() {
        return U.clamp(U.lerp(2.3, 1.0, E.skill) + U.gauss() * U.lerp(0.9, 0.35, E.skill), 0.15, 4.2);
      }
      function newRound() {
        round++;
        T = T0;
        st = 'run';
        E.players.forEach((p) => {
          done[p.id] = null;
          thr[p.id] = threshold();
        });
      }
      const pos = (p) => E.home(p, (p.corner ? 13 : 12) * E.arena.u);
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          newRound();
        },
        update(dt) {
          flash = Math.max(0, flash - dt * 3);
          boomT = Math.max(0, boomT - dt);
          if (st === 'pause') {
            pause -= dt;
            if (pause <= 0) {
              if (round >= ROUNDS) return E.finish(E.best(sc, 'max'), 'Рахунок: ' + Math.max(...E.players.map((p) => sc[p.id])));
              newRound();
            }
            return;
          }
          T -= dt * (1 + round * 0.08);
          if (T <= 0) {
            T = 0;
            for (const p of E.players) {
              if (done[p.id] != null) continue;
              sc[p.id] -= 5;
              done[p.id] = -5;
              const q = pos(p);
              E.float(q.x, q.y, '−5', '#FF5468', p.rot);
              E.burst(q.x, q.y, ['#FF5468', '#FFC530'], 18);
            }
            G.sfx('boom');
            E.shake(8);
            boomT = 0.6;
            st = 'pause';
            pause = 1.8;
          } else if (E.players.every((p) => done[p.id] != null)) {
            st = 'pause';
            pause = 1.1;
          }
        },
        bot(p) {
          if (st !== 'run' || done[p.id] != null) return;
          const left = E.players.filter((q) => done[q.id] == null).length;
          // останній, хто лишився, нервує сильніше
          const t = thr[p.id] + (left === 1 ? 0.7 : 0);
          if (T <= t) E.tap(p.id);
        },
        press(p) {
          if (st !== 'run' || done[p.id] != null) return;
          const pts = Math.max(0, Math.round((T0 - T) * 2));
          sc[p.id] += pts;
          done[p.id] = pts;
          T = T0;
          flash = 1;
          G.sfx(pts >= 8 ? 'coin' : 'point');
          const q = pos(p);
          E.float(q.x, q.y, '+' + pts, p.color.l, p.rot);
        },
        label(p) {
          const d = done[p.id];
          if (d == null) return null;
          return d < 0 ? 'БАХ −5' : '✓ +' + d;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          if (boomT > 0) {
            g.fillStyle = `rgba(255,84,104,${boomT * 0.5})`;
            g.fillRect(ar.x, ar.y, ar.w, ar.h);
          }
          const R = 22 * u, f = T / T0;
          g.beginPath();
          g.arc(ar.cx, ar.cy, R, 0, TAU);
          g.fillStyle = '#0F0B22';
          g.fill();
          g.lineWidth = 3.2 * u;
          g.strokeStyle = 'rgba(255,255,255,0.08)';
          g.stroke();
          const col = f > 0.5 ? '#35D486' : f > 0.25 ? '#FFC530' : '#FF5468';
          g.strokeStyle = col;
          g.lineCap = 'round';
          g.beginPath();
          g.arc(ar.cx, ar.cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * f);
          g.stroke();
          g.lineCap = 'butt';
          if (flash > 0) {
            g.strokeStyle = `rgba(255,255,255,${flash})`;
            g.lineWidth = 1.2 * u;
            g.beginPath();
            g.arc(ar.cx, ar.cy, R + 4 * u * (1 - flash), 0, TAU);
            g.stroke();
          }
          E.dual(g, (x, y) => E.txt(g, T.toFixed(1), x, y, 9 * u, col, { weight: 900 }), E.needDual ? 7 * u : 0);
          E.dual(g, (x, y) => E.txt(g, `РАУНД ${Math.min(round, ROUNDS)}/${ROUNDS}`, x, y, 3.2 * u, 'rgba(246,241,255,0.55)', { body: true, weight: 800 }), 30 * u, true);
          for (const p of E.players) {
            const q = pos(p), d = done[p.id];
            g.beginPath();
            g.arc(q.x, q.y, 7 * u, 0, TAU);
            g.fillStyle = d == null ? p.color.d : d < 0 ? '#4A4468' : p.color.c;
            g.fill();
            E.txt(g, d == null ? '⌛' : d < 0 ? '✖' : '✓', q.x, q.y + 0.3 * u, 6 * u, '#fff');
            E.hud(g, p, String(sc[p.id]), { color: p.color.l, size: 5 * u });
          }
        },
      };
    },
  });
})();
