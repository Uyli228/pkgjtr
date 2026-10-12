(function () {
  const { U } = G;
  G.game({
    id: 'count', name: 'Порахуй котиків', icon: '🐱', tag: "Пам'ять", bg: '#1C2A1A', btn: '+1',
    desc: 'Повз пробігатимуть тварини. Рахуйте лише котиків! Потім натисніть свою кнопку стільки разів, скільки їх було. Найближча відповідь перемагає.',
    create(E) {
      const SHOW = 9.5, ANSWER = 7;
      const OTHERS = ['🐶', '🐰', '🦊', '🐹', '🐻', '🐼', '🐨'];
      let animals = [], cats = 0, phase = 'show', t = 0;
      const guess = {}, botGoal = {}, botT = {};
      function plan() {
        cats = U.randi(6, 13);
        const others = U.randi(9, 15);
        const list = U.shuffle([...Array(cats).fill('🐱'), ...Array(others).fill(null).map(() => U.pick(OTHERS))]);
        const span = SHOW - 3.0;
        animals = list.map((ch, i) => {
          const dir = Math.random() < 0.5 ? 1 : -1;
          return {
            ch, dir, at: (i / list.length) * span + U.rand(-0.15, 0.25),
            y: U.rand(0.12, 0.88), speed: U.rand(0.5, 1.0), hop: Math.random() * 6, x: 0,
          };
        });
      }
      return {
        init() {
          plan();
          for (const p of E.players) {
            guess[p.id] = 0;
            const r = Math.random();
            const err = r < 0.2 + E.skill * 0.5 ? 0 : r < 0.85 ? U.pick([-1, 1]) : U.pick([-2, 2, 3]);
            botGoal[p.id] = Math.max(1, cats + err);
            botT[p.id] = U.rand(0.4, 1);
          }
        },
        update(dt) {
          t += dt;
          if (phase === 'show') {
            if (t >= SHOW) {
              phase = 'answer';
              t = 0;
              G.sfx('alarm');
            }
          } else if (phase === 'answer') {
            if (t >= ANSWER) {
              phase = 'reveal';
              t = 0;
              G.sfx('meow');
            }
          } else if (phase === 'reveal' && t > 1.4) {
            const d = {};
            for (const p of E.players) d[p.id] = Math.abs(guess[p.id] - cats);
            E.finish(E.best(d, 'min'), `Котиків було: ${cats}`);
          }
        },
        bot(p, dt) {
          if (phase !== 'answer') return;
          botT[p.id] -= dt;
          if (botT[p.id] <= 0 && guess[p.id] < botGoal[p.id]) {
            E.tap(p.id);
            botT[p.id] = U.rand(0.16, 0.3);
          }
        },
        press(p) {
          if (phase !== 'answer') return;
          guess[p.id]++;
          G.sfx('tap', guess[p.id] % 5);
        },
        label(p) {
          return phase === 'show' ? 'РАХУЙ…' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // трава й доріжки
          g.fillStyle = '#1F311C';
          for (let i = 0; i < 6; i++) g.fillRect(ar.x, ar.y + (i + 0.5) * (ar.h / 6), ar.w, 2);
          const showT = phase === 'show' ? t : SHOW + 5;
          if (phase === 'show' || E.phase === 'intro' || E.phase === 'count') {
            for (const a of animals) {
              const k = (showT - a.at) * a.speed;
              if (k < 0 || k > 1.3) continue;
              const x = a.dir > 0 ? ar.x - 0.15 * ar.w + k * ar.w : ar.x + ar.w * 1.15 - k * ar.w;
              const y = ar.y + a.y * ar.h - Math.abs(Math.sin(showT * 9 + a.hop)) * 2.5 * u;
              E.emoji(g, a.ch, x, y, 12 * u);
            }
            if (phase === 'show' && E.phase === 'play') E.timeBar(g, 1 - t / SHOW, '#35D486');
          }
          if (phase === 'answer' || phase === 'reveal' || E.phase === 'result' || E.phase === 'done') {
            const q = phase === 'answer' ? 'СКІЛЬКИ БУЛО КОТИКІВ?' : `КОТИКІВ: ${cats}`;
            E.dual(g, (cx, cy) => {
              E.emoji(g, '🐱', cx, cy - 7 * u, 14 * u);
              E.txt(g, q, cx, cy + 6 * u, Math.min(5.2 * u, 20), '#F6F1FF', { weight: 900 });
            }, E.needDual ? ar.h * 0.2 : 0);
            if (phase === 'answer') E.timeBar(g, 1 - t / ANSWER, '#FFC530');
            for (const p of E.players) {
              const showNum = phase !== 'answer' || !p.bot;
              E.hud(g, p, showNum ? String(guess[p.id]) : '•'.repeat(Math.min(guess[p.id], 3)) || '…', { size: 7 * u, color: p.color.l, off: 9 * u });
            }
          }
        },
      };
    },
  });
})();
