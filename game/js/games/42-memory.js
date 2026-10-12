(function () {
  const { U } = G;
  G.game({
    id: 'memory', name: 'Картки', icon: '🃏', tag: "Пам'ять", bg: '#1B2340', btn: 'ТУТ!',
    verb: "ЗАПАМ'ЯТАЙ!",
    desc: "Запам'ятай картки. Тисни, коли рамка на потрібній. До 3.",
    create(E) {
      const WIN = 3, ANIM = ['🐱', '🐶', '🐸', '🐵', '🐷', '🐰', '🦊', '🐼', '🐔', '🐮'];
      const sc = {}, lock = {}, botAt = {};
      let cards = [], st = 'show', t = 0, target = null, cursor = 0, curT = 0, solvedBy = null;
      function newBoard() {
        const pool = U.shuffle(ANIM).slice(0, 8);
        cards = pool.map((ch) => ({ ch, open: true }));
        st = 'show';
        t = 0;
      }
      function ask() {
        const hidden = cards.filter((c) => !c.open);
        if (!hidden.length) return newBoard();
        target = U.pick(hidden);
        st = 'ask';
        t = 0;
        cursor = U.randi(0, cards.length - 1);
        curT = 0;
        solvedBy = null;
        E.players.forEach((p) => {
          lock[p.id] = false;
          // бот «пам'ятає» картку з певною ймовірністю
          botAt[p.id] = Math.random() < 0.35 + E.skill * 0.6 ? 'know' : 'guess';
        });
      }
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          newBoard();
        },
        update(dt) {
          t += dt;
          if (st === 'show' && t > 4) {
            cards.forEach((c) => (c.open = false));
            ask();
          } else if (st === 'ask') {
            curT += dt;
            if (curT > 0.7) {
              curT = 0;
              cursor = (cursor + 1) % cards.length;
            }
            if (t > 12) {
              target.open = true;
              st = 'reveal';
              t = 0;
            }
          } else if (st === 'reveal' && t > 1.2) {
            const w = E.players.find((p) => sc[p.id] >= WIN);
            if (w) return E.finish([w.id]);
            ask();
          }
        },
        bot(p) {
          if (st !== 'ask' || lock[p.id] || curT < 0.25) return;
          const on = cards[cursor] === target;
          if (botAt[p.id] === 'know' && on && Math.random() < 0.15) E.tap(p.id);
          else if (botAt[p.id] === 'guess' && Math.random() < 0.004) E.tap(p.id);
        },
        press(p) {
          if (st !== 'ask' || lock[p.id]) return;
          const h = E.home(p, 12 * E.arena.u);
          if (cards[cursor] === target) {
            sc[p.id]++;
            target.open = true;
            solvedBy = p.id;
            st = 'reveal';
            t = 0;
            G.sfx('point');
            E.hitstop(0.06);
            E.float(h.x, h.y, '+1', p.color.l, p.rot);
          } else {
            lock[p.id] = true;
            cards[cursor].peek = 0.8;
            sc[p.id] = Math.max(0, sc[p.id] - 1);
            G.sfx('bad');
            E.float(h.x, h.y, '−1', '#FF5468', p.rot);
          }
        },
        label(p) {
          return lock[p.id] && st === 'ask' ? 'ЧЕКАЙ' : st === 'show' ? 'ДИВИСЬ…' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const cols = 4, rows = 2;
          const cw = Math.min((ar.w * 0.84) / cols, 21 * u), ch = cw * 1.25;
          const x0 = ar.cx - (cols * cw) / 2, y0 = ar.cy - (rows * ch) / 2;
          cards.forEach((c, i) => {
            if (c.peek) c.peek = Math.max(0, c.peek - 1 / 60);
            const x = x0 + (i % cols) * cw + cw * 0.06, y = y0 + Math.floor(i / cols) * ch + ch * 0.06;
            const w = cw * 0.88, h = ch * 0.88;
            const face = c.open || c.peek > 0 || E.phase !== 'play';
            g.fillStyle = face ? '#FFF8EA' : '#3A4A8A';
            U.rr(g, x, y, w, h, 2 * u);
            g.fill();
            if (face) E.emoji(g, c.ch, x + w / 2, y + h / 2, w * 0.6);
            else {
              g.fillStyle = 'rgba(255,255,255,0.15)';
              E.txt(g, '?', x + w / 2, y + h / 2, w * 0.5, 'rgba(255,255,255,0.3)');
            }
            if (st === 'ask' && i === cursor) {
              g.strokeStyle = '#FFC530';
              g.lineWidth = 1.2 * u;
              U.rr(g, x - 1, y - 1, w + 2, h + 2, 2 * u);
              g.stroke();
            }
            if (st === 'reveal' && c === target) {
              g.strokeStyle = solvedBy != null ? G.COLORS[solvedBy].c : '#fff';
              g.lineWidth = 1.4 * u;
              U.rr(g, x - 1, y - 1, w + 2, h + 2, 2 * u);
              g.stroke();
            }
          });
          // що шукаємо — велике, для обох сторін
          if (st === 'ask' || st === 'reveal') {
            E.dual(g, (x, y) => {
              g.fillStyle = 'rgba(16,12,36,0.85)';
              U.rr(g, x - 11 * u, y - 8 * u, 22 * u, 16 * u, 4 * u);
              g.fill();
              E.txt(g, 'ДЕ', x - 5.5 * u, y, 3.6 * u, '#FFC530');
              E.emoji(g, target.ch, x + 4 * u, y, 10 * u);
            }, ch + 9 * u, true);
          }
          for (const p of E.players) E.hud(g, p, `${sc[p.id]} / ${WIN}`, { color: p.color.l });
        },
      };
    },
  });
})();
