(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'trap', name: 'Пастка для друга', icon: '🪤', tag: 'Підстава', bg: '#1B2433', btn: 'ПАСТКА',
    verb: 'ПІДСТАВ ДРУГА',
    desc: 'Спершу тап — поставити пастку. Потім тап — стрибок. Очко, лише якщо хтось інший упав. Твоя пастка спіймала — ще +1.',
    create(E) {
      const ROUNDS = 3, X0 = 0.08, X1 = 0.92, TW = 0.035, AIR = 0.42, SPD = 0.24;
      const sc = {}, R = {};
      let round = 0, st = 'place', t = 0, cursor = 0.3, cdir = 1, traps = [], note = '';
      function newRound() {
        round++;
        st = 'place';
        t = 0;
        traps = [];
        note = '';
        E.players.forEach((p) => (R[p.id] = { placed: false, x: X0, air: 0, fell: false, botAt: U.rand(0.6, 3.2), plan: {} }));
      }
      function lanesY(i) {
        const ar = E.arena, n = E.n;
        const top = ar.y + ar.h * 0.25, h = ar.h * 0.5;
        return top + (h * (i + 0.5)) / n;
      }
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          newRound();
        },
        update(dt) {
          t += dt;
          if (st === 'place') {
            cursor += cdir * 0.62 * dt;
            if (cursor > 0.86) { cursor = 0.86; cdir = -1; }
            if (cursor < 0.2) { cursor = 0.2; cdir = 1; }
            if (t > 4 || E.players.every((p) => R[p.id].placed)) {
              st = 'run';
              t = 0;
              G.sfx('go');
            }
          } else if (st === 'run') {
            let anyRunning = false;
            for (const p of E.players) {
              const r = R[p.id];
              if (r.fell || r.x >= X1) continue;
              anyRunning = true;
              r.x += SPD * dt;
              r.air = Math.max(0, r.air - dt);
              if (r.air > 0) continue;
              for (const tr of traps) {
                if (Math.abs(r.x - tr.x) < TW * 0.8) {
                  r.fell = true;
                  G.sfx('hit');
                  E.shake(5);
                  E.flash('#FF5468', 0.5);
                  const ar = E.arena;
                  E.burst(ar.x + r.x * ar.w, lanesY(p.seat), p.color.c, 16);
                  if (tr.owner !== p.id) {
                    sc[tr.owner]++;
                    E.float(ar.x + tr.x * ar.w, lanesY(p.seat) - 6 * ar.u, '+1 ' + G.COLORS[tr.owner].name, G.COLORS[tr.owner].l);
                  }
                  break;
                }
              }
            }
            if (!anyRunning) {
              const fell = E.players.filter((p) => R[p.id].fell);
              if (fell.length && fell.length < E.n) {
                E.players.forEach((p) => { if (!R[p.id].fell) sc[p.id]++; });
                note = 'Ті, хто дійшов, +1';
                G.sfx('point');
              } else note = fell.length ? 'Упали всі — очок немає' : 'Дійшли всі — очок немає!';
              st = 'end';
              t = 0;
            }
          } else if (st === 'end' && t > 1.8) {
            if (round >= ROUNDS) return E.finish(E.best(sc, 'max'), 'Рахунок: ' + Math.max(...E.players.map((p) => sc[p.id])));
            newRound();
          }
        },
        bot(p) {
          const r = R[p.id];
          if (st === 'place' && !r.placed && t >= r.botAt) E.tap(p.id);
          if (st === 'run' && !r.fell && r.air <= 0) {
            for (const tr of traps) {
              const d = tr.x - r.x;
              if (d <= 0) continue;
              const key = traps.indexOf(tr);
              if (r.plan[key] == null) r.plan[key] = U.rand(0.04, 0.09) + U.gauss() * U.lerp(0.05, 0.012, E.skill);
              if (d / SPD < AIR * 0.5 + r.plan[key] - 0.06) E.tap(p.id);
              break;
            }
          }
        },
        press(p) {
          const r = R[p.id];
          if (st === 'place' && !r.placed) {
            r.placed = true;
            traps.push({ x: cursor, owner: p.id });
            G.sfx('stick');
          } else if (st === 'run' && !r.fell && r.air <= 0 && r.x < X1) {
            r.air = AIR;
            G.sfx('jump');
          }
        },
        label(p) {
          const r = R[p.id];
          if (st === 'place') return r.placed ? 'ГОТОВО ✓' : 'ПАСТКА';
          if (st === 'run') return r.fell ? 'УПАВ' : 'СТРИБОК';
          return null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const top = ar.y + ar.h * 0.25, h = ar.h * 0.5;
          g.fillStyle = '#22304A';
          g.fillRect(ar.x, top, ar.w, h);
          for (const p of E.players) {
            const y = lanesY(p.seat);
            g.strokeStyle = 'rgba(255,255,255,0.08)';
            g.beginPath();
            g.moveTo(ar.x, y + 4 * u);
            g.lineTo(ar.x + ar.w, y + 4 * u);
            g.stroke();
          }
          // фініш
          for (let i = 0; i < 12; i++) {
            g.fillStyle = i % 2 ? '#111' : '#eee';
            g.fillRect(ar.x + X1 * ar.w, top + (i * h) / 12, 1.4 * u, h / 12);
          }
          // пастки
          for (const tr of traps) {
            const x = ar.x + tr.x * ar.w, c = G.COLORS[tr.owner];
            g.fillStyle = U.alpha(c.c, 0.2);
            g.fillRect(x - TW * ar.w * 0.5, top, TW * ar.w, h);
            for (const p of E.players) {
              const y = lanesY(p.seat) + 4 * u;
              g.fillStyle = c.c;
              g.beginPath();
              for (let k = 0; k < 3; k++) {
                const sx = x - TW * ar.w * 0.5 + (k * TW * ar.w) / 3;
                g.moveTo(sx, y);
                g.lineTo(sx + (TW * ar.w) / 6, y - 3.5 * u);
                g.lineTo(sx + (TW * ar.w) / 3, y);
              }
              g.fill();
            }
          }
          // курсор розстановки
          if (st === 'place' && E.phase === 'play') {
            const x = ar.x + cursor * ar.w;
            g.strokeStyle = '#FFC530';
            g.lineWidth = 0.8 * u;
            g.setLineDash([1.5 * u, 1.5 * u]);
            g.beginPath();
            g.moveTo(x, top - 3 * u);
            g.lineTo(x, top + h + 3 * u);
            g.stroke();
            g.setLineDash([]);
            E.emoji(g, '🪤', x, top - 6 * u, 7 * u);
          }
          // бігуни
          const ar2 = Math.min(5 * u, (h / E.n) * 0.32);
          for (const p of E.players) {
            const r = R[p.id];
            const y = lanesY(p.seat) + 4 * u - ar2;
            const jump = r.air > 0 ? Math.sin((1 - r.air / AIR) * Math.PI) * ar2 * 2.4 : st === 'run' && !r.fell ? Math.abs(Math.sin(E.t * 14)) * ar2 * 0.25 : 0;
            const mood = r.fell ? 'hurt' : r.x >= X1 ? 'happy' : st === 'run' ? 'scared' : 'sly';
            E.avatar(g, ar.x + r.x * ar.w, y - jump + (r.fell ? ar2 * 0.4 : 0), ar2, p, mood);
          }
          const msg = st === 'place' ? 'СТАВТЕ ПАСТКИ!' : st === 'run' ? 'БІЖІТЬ!' : note;
          E.dual(g, (x, y) => E.txt(g, msg, x, y, 4.2 * u, '#F6F1FF', { stroke: '#1B2433' }), ar.h * 0.33, true);
          E.dual(g, (x, y) => E.txt(g, `РАУНД ${Math.min(round, ROUNDS)}/${ROUNDS}`, x, y, 3 * u, 'rgba(246,241,255,0.5)', { body: true, weight: 800 }), ar.h * 0.39, true);
          for (const p of E.players) E.hud(g, p, String(sc[p.id]), { color: p.color.l, size: 5 * u });
        },
      };
    },
  });
})();
