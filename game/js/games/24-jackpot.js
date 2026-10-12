(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'jackpot', name: 'Джекпот привидів', icon: '👻', tag: 'Блеф', bg: '#14122E', btn: 'ТРИМАЙ',
    verb: 'ВІДПУСТИ ВЧАСНО', desc: 'Тримай — джекпот росте, відпусти — забери. Вибух забирає все. Привиди лякають фальшивими вибухами.',
    create(E) {
      const ROUNDS = 3;
      const sc = {}, got = {}, holding = {}, ghostCd = {}, bt = {}, plan = {};
      let round = 0, st = 'ready', t = 0, J = 0, bustAt = 0, fakeT = 0, boomT = 0, fakeBy = null, busted = false;
      function newRound() {
        round++;
        st = 'ready';
        t = 0;
        J = 0;
        bustAt = U.rand(4.5, 13);
        busted = false;
        E.players.forEach((p) => {
          got[p.id] = null;
          holding[p.id] = false;
          ghostCd[p.id] = 0;
          bt[p.id] = U.rand(1.5, 3);
          plan[p.id] = U.rand(3, 11) * U.lerp(0.9, 1, E.skill);
        });
      }
      function bank(p) {
        if (!holding[p.id]) return;
        holding[p.id] = false;
        got[p.id] = Math.floor(J);
        sc[p.id] += got[p.id];
        G.sfx('coin');
        const q = E.home(p, 12 * E.arena.u);
        E.float(q.x, q.y, '+' + got[p.id], p.color.l, p.rot);
      }
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          newRound();
        },
        update(dt) {
          t += dt;
          fakeT = Math.max(0, fakeT - dt);
          boomT = Math.max(0, boomT - dt);
          for (const p of E.players) ghostCd[p.id] = Math.max(0, ghostCd[p.id] - dt);
          if (st === 'ready') {
            if (t >= 2) {
              E.players.forEach((p) => {
                holding[p.id] = !!E.down[p.id];
                if (!holding[p.id]) got[p.id] = 0;
              });
              st = 'grow';
              t = 0;
              G.sfx('go');
            }
          } else if (st === 'grow') {
            J = Math.pow(t, 1.35) * 2.2;
            if (t >= bustAt) {
              st = 'end';
              t = 0;
              boomT = 1.4;
              busted = true;
              E.hitstop(0.12);
              G.sfx('boom');
              E.shake(12);
              E.burst(E.arena.cx, E.arena.cy, ['#FFC530', '#FF5468', '#FF9E4A', '#fff'], 80, 1.4);
              for (const p of E.players) if (holding[p.id]) {
                holding[p.id] = false;
                got[p.id] = 0;
              }
            } else if (!E.players.some((p) => holding[p.id])) {
              st = 'end';
              t = 0;
            }
          } else if (st === 'end' && t > 2.2) {
            if (round >= ROUNDS) return E.finish(E.best(sc, 'max'), 'Рахунок: ' + Math.max(...E.players.map((p) => sc[p.id])));
            newRound();
          }
        },
        bot(p, dt) {
          if (st === 'ready') {
            if (t > 0.3 && !E.down[p.id]) E.hold(p.id, true);
            return;
          }
          if (st !== 'grow') return;
          if (holding[p.id]) {
            // фальшивий вибух лякає бота з певною ймовірністю
            if (fakeT > 0.5 && fakeBy !== p.id && Math.random() < (1 - E.skill) * 0.05 + 0.01) E.hold(p.id, false);
            else if (t >= plan[p.id]) E.hold(p.id, false);
          } else {
            bt[p.id] -= dt;
            if (bt[p.id] <= 0 && ghostCd[p.id] <= 0) {
              E.tap(p.id);
              bt[p.id] = U.rand(1.5, 4);
            }
          }
        },
        press(p) {
          if (st !== 'grow' || holding[p.id] || ghostCd[p.id] > 0) return;
          // привид лякає: фальшивий вибух
          ghostCd[p.id] = 2.5;
          fakeT = 0.9;
          fakeBy = p.id;
          G.sfx('boom');
          E.shake(6);
        },
        release(p) {
          if (st === 'grow') bank(p);
        },
        label(p) {
          if (st === 'ready') return E.down[p.id] ? 'В ГРІ ✓' : 'ЗАТИСНИ';
          if (holding[p.id]) return 'ТРИМАЮ…';
          if (st === 'grow') return ghostCd[p.id] > 0 ? '👻 …' : '👻 ЛЯКАЙ';
          return got[p.id] ? '+' + got[p.id] : '0';
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const glow = st === 'grow' ? Math.min(1, J / 40) : 0;
          g.fillStyle = `rgba(255,197,48,${glow * 0.12})`;
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          // мішок із джекпотом
          const R = (9 + Math.min(16, J * 0.35)) * u * (1 + Math.sin(E.t * (4 + J * 0.2)) * 0.03);
          if (st !== 'end') {
            {
              g.fillStyle = '#B98500';
              g.beginPath();
              g.arc(ar.cx, ar.cy, R, 0, TAU);
              g.fill();
              g.fillStyle = '#FFC530';
              g.beginPath();
              g.arc(ar.cx - R * 0.1, ar.cy - R * 0.1, R * 0.85, 0, TAU);
              g.fill();
            }
          }
          const real = st === 'end' && boomT > 0;
          const fake = fakeT > 0 && st === 'grow';
          if (real || fake) {
            const k = real ? boomT / 1.4 : fakeT / 0.9;
            g.fillStyle = `rgba(255,84,104,${k * 0.45})`;
            g.fillRect(ar.x, ar.y, ar.w, ar.h);
          }
          let txt = st === 'ready' ? 'ЗАТИСНІТЬ!' : st === 'grow' ? String(Math.floor(J)) : busted ? 'ДЖЕКПОТ ЗГОРІВ' : 'УСІ ВСТИГЛИ';
          let col = st === 'grow' ? '#1A1233' : '#F6F1FF';
          if (fake && fakeT > 0.4) {
            txt = '💥 ВИБУХ!';
            col = '#FF5468';
          } else if (fake) {
            txt = '👻 ЖАРТ!';
            col = '#C9C2EA';
          }
          E.dual(g, (x, y) => E.txt(g, txt, x, y, (txt.length > 5 ? 5.5 : 10) * u, col, { weight: 900, stroke: col === '#1A1233' ? null : '#14122E' }), E.needDual && st !== 'grow' ? 7 * u : E.needDual ? 4 * u : 0);
          E.dual(g, (x, y) => E.txt(g, `РАУНД ${Math.min(round, ROUNDS)}/${ROUNDS}`, x, y, 3.2 * u, 'rgba(246,241,255,0.5)', { body: true, weight: 800 }), 32 * u, true);
          for (const p of E.players) {
            const q = E.home(p, (p.corner ? 12 : 10) * u);
            const ghost = !holding[p.id] && st !== 'ready';
            g.globalAlpha = ghost ? 0.75 : 1;
            if (ghost) E.emoji(g, '👻', q.x, q.y + Math.sin(E.t * 3 + p.seat) * u, 9 * u, p.rot);
            else E.avatar(g, q.x, q.y, 6.5 * u, p, st === 'grow' ? (J > 25 ? 'scared' : 'sly') : st === 'end' && got[p.id] === 0 ? 'hurt' : 'idle', p.rot);
            g.globalAlpha = 1;
            E.hud(g, p, String(sc[p.id]), { color: p.color.l, size: 5 * u });
          }
        },
      };
    },
  });
})();
