(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'hoops', name: 'Баскетбол', icon: '🏀', tag: 'Влучність', bg: '#3A2418', btn: 'КИДОК', lanes: true,
    verb: 'У КОШИК!',
    desc: 'Кошик їздить. Тап — кидок. Хто перший закине 5.',
    create(E) {
      const GOAL = 5, FLY = 0.55;
      const S = {};
      return {
        init() {
          for (const p of E.players) S[p.id] = { ph: Math.random() * TAU, sc: 0, ball: null, cd: 0, swish: 0, miss: 0 };
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            // кошик швидшає з кожним влучанням
            s.ph += dt * (1.6 + s.sc * 0.35);
            s.cd = Math.max(0, s.cd - dt);
            s.swish = Math.max(0, s.swish - dt);
            s.miss = Math.max(0, s.miss - dt);
            if (s.ball) {
              s.ball.t += dt;
              if (s.ball.t >= FLY && !s.ball.done) {
                s.ball.done = true;
                const hx = 0.5 + Math.sin(s.ph) * 0.38;
                if (Math.abs(hx - 0.5) < 0.075) {
                  s.sc++;
                  s.swish = 0.6;
                  G.sfx('point');
                  E.flash(p.color.c, 0.3);
                  if (s.sc >= GOAL) return E.finish([p.id]);
                } else {
                  s.miss = 0.5;
                  G.sfx('thud');
                }
              }
              if (s.ball.t > FLY + 0.35) s.ball = null;
            }
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.ball || s.cd > 0) return;
          s.ball = { t: 0 };
          s.cd = 0.25;
          G.sfx('whoosh');
        },
        bot(p) {
          const s = S[p.id];
          if (s.ball || s.cd > 0) return;
          const w = 1.6 + s.sc * 0.35;
          // де буде кошик, коли м'яч долетить
          if (s.err == null) s.err = U.gauss() * U.lerp(0.12, 0.025, E.skill);
          const future = 0.5 + Math.sin(s.ph + w * FLY) * 0.38;
          if (Math.abs(future - 0.5 + s.err) < 0.03) {
            E.tap(p.id);
            s.err = null;
          }
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              g.fillStyle = '#C9824E';
              g.fillRect(0, h * 0.55, w, h * 0.45);
              g.strokeStyle = 'rgba(255,255,255,0.35)';
              g.lineWidth = 2;
              g.beginPath();
              g.arc(w / 2, h, h * 0.3, Math.PI, TAU);
              g.stroke();
              // кошик
              const hx = (0.5 + Math.sin(s.ph) * 0.38) * w, hy = h * 0.22, hw = m * 0.16;
              g.fillStyle = '#F6F1FF';
              g.fillRect(hx - hw * 0.9, hy - m * 0.17, hw * 1.8, m * 0.14);
              g.strokeStyle = '#FF5468';
              g.lineWidth = 2;
              g.strokeRect(hx - hw * 0.3, hy - m * 0.12, hw * 0.6, m * 0.08);
              g.strokeStyle = s.swish > 0 ? p.color.c : '#FF7A3D';
              g.lineWidth = Math.max(3, m * 0.025);
              g.beginPath();
              g.ellipse(hx, hy, hw / 2, hw * 0.12, 0, 0, TAU);
              g.stroke();
              g.strokeStyle = 'rgba(255,255,255,0.6)';
              g.lineWidth = 1;
              for (let i = -2; i <= 2; i++) {
                g.beginPath();
                g.moveTo(hx + (i * hw) / 5, hy);
                g.lineTo(hx + (i * hw) / 8, hy + m * 0.1);
                g.stroke();
              }
              // зона влучання по центру
              g.fillStyle = 'rgba(255,255,255,0.12)';
              g.fillRect(w * 0.425, hy - m * 0.02, w * 0.15, m * 0.04);
              // м'яч
              const bx = w / 2;
              let by = h * 0.8, br = m * 0.07;
              if (s.ball) {
                const k = Math.min(1, s.ball.t / FLY);
                by = U.lerp(h * 0.8, hy, k) - Math.sin(k * Math.PI) * h * 0.2;
                br *= 1 - k * 0.35;
                if (s.ball.t > FLY) by = hy + (s.ball.t - FLY) * h * 1.5;
              }
              E.emoji(g, '🏀', bx, by, br * 2);
              E.avatar(g, w * 0.12, h * 0.82, m * 0.08, p, s.swish > 0 ? 'happy' : s.miss > 0 ? 'hurt' : 'idle');
              E.txt(g, s.sc + ' / ' + GOAL, w * 0.88, h * 0.82, m * 0.1, p.color.l, { stroke: 'rgba(0,0,0,0.5)' });
            });
          }
        },
      };
    },
  });
})();
