(function () {
  const { U } = G;
  G.game({
    id: 'stroop', name: 'Кольоровий хаос', icon: '🎨', tag: 'Уважність', bg: '#17142E', btn: 'ЗБІГ!',
    desc: 'Тисніть, лише коли колір літер збігається зі словом (слово «СИНІЙ» написане синім). Помилка — мінус очко. До 5 очок.',
    create(E) {
      const WIN = 5;
      const WORDS = [
        ['ЧЕРВОНИЙ', '#FF5468'], ['СИНІЙ', '#3AA8FF'], ['ЗЕЛЕНИЙ', '#35D486'],
        ['ЖОВТИЙ', '#FFC530'], ['БІЛИЙ', '#F6F1FF'], ['РОЖЕВИЙ', '#FF7AD9'],
      ];
      const sc = {}, lock = {}, botT = {};
      let card, t = 0, misses = 0, solvedBy = null, solvedT = 0, speed = 1;

      function next() {
        const match = misses >= 3 || Math.random() < 0.36;
        const w = U.randi(0, WORDS.length - 1);
        let c = w;
        if (!match) while (c === w) c = U.randi(0, WORDS.length - 1);
        misses = match ? 0 : misses + 1;
        card = { word: WORDS[w][0], col: WORDS[c][1], match, t: 0, dur: U.rand(1.25, 1.9) * speed };
        speed = Math.max(0.62, speed * 0.965);
        solvedBy = null;
        E.players.forEach((p) => {
          botT[p.id] = null;
          if (!p.bot) return;
          if (match) {
            if (Math.random() < 0.15 + E.skill * 0.8) botT[p.id] = U.lerp(0.95, 0.42, E.skill) + U.rand(0, 0.3);
          } else if (Math.random() < (1 - E.skill) * 0.12) botT[p.id] = U.rand(0.3, 0.9);
        });
      }
      return {
        init() {
          E.players.forEach((p) => {
            sc[p.id] = 0;
            lock[p.id] = 0;
          });
          next();
        },
        update(dt) {
          t += dt;
          card.t += dt;
          for (const p of E.players) lock[p.id] = Math.max(0, lock[p.id] - dt);
          if (solvedBy != null) {
            solvedT -= dt;
            if (solvedT <= 0) {
              const w = E.players.find((p) => sc[p.id] >= WIN);
              if (w) return E.finish([w.id]);
              next();
            }
          } else if (card.t >= card.dur) next();
          if (E.playT > 75) E.finish(E.best(sc, 'max'));
        },
        bot(p) {
          if (botT[p.id] != null && card.t >= botT[p.id] && solvedBy == null) {
            botT[p.id] = null;
            E.tap(p.id);
          }
        },
        press(p) {
          if (lock[p.id] > 0 || solvedBy != null) return;
          const pos = E.home(p, 12 * E.arena.u);
          if (card.match) {
            sc[p.id]++;
            solvedBy = p.id;
            solvedT = 0.55;
            G.sfx('point');
            E.float(pos.x, pos.y, '+1', p.color.c, p.rot);
          } else {
            sc[p.id] = Math.max(0, sc[p.id] - 1);
            lock[p.id] = 0.8;
            G.sfx('bad');
            E.shake(3);
            E.float(pos.x, pos.y, '−1', '#FF5468', p.rot);
          }
        },
        label(p) {
          return lock[p.id] > 0 ? 'ОЙ!' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // смуги-кольори на фоні
          const cols = ['#FF5468', '#3AA8FF', '#35D486', '#FFC530'];
          g.globalAlpha = 0.07;
          for (let i = 0; i < 8; i++) {
            g.fillStyle = cols[i % 4];
            g.fillRect(ar.x + (i * ar.w) / 8, ar.y, ar.w / 8, ar.h);
          }
          g.globalAlpha = 1;
          // картка
          const cw = Math.min(ar.w * 0.88, 92 * u), ch = Math.min(ar.h * 0.42, 70 * u);
          U.rr(g, ar.cx - cw / 2, ar.cy - ch / 2, cw, ch, 4 * u);
          g.fillStyle = '#0F0C22';
          g.fill();
          if (solvedBy != null) {
            g.lineWidth = 1.4 * u;
            g.strokeStyle = E.byId(solvedBy).color.c;
            g.stroke();
          }
          // таймер картки
          if (solvedBy == null) {
            const f = 1 - card.t / card.dur;
            g.fillStyle = 'rgba(255,255,255,0.18)';
            g.fillRect(ar.cx - (cw * 0.7 * f) / 2, ar.cy - 0.6 * u, cw * 0.7 * f, 1.2 * u);
          }
          let fs = 10 * u;
          g.font = `900 ${fs}px ${G.FONT_D}`;
          const mw = g.measureText(card.word).width;
          if (mw > cw * 0.9) fs *= (cw * 0.9) / mw;
          E.dual(g, (cx, cy) => E.txt(g, card.word, cx, cy, fs, card.col, { weight: 900 }), E.needDual ? ch * 0.25 : 0);
          for (const p of E.players) E.hud(g, p, `${sc[p.id]} / ${WIN}`, { color: p.color.l });
        },
      };
    },
  });
})();
