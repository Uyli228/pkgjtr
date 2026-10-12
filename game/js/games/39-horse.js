(function () {
  const { U } = G;
  G.game({
    id: 'horse', name: 'Кінь', icon: '🐎', tag: 'Перегони', bg: '#2A3A1E', btn: 'СТРИБОК', lanes: true,
    verb: 'СТРИБАЙ ВЧАСНО!',
    desc: 'Кінь біжить сам. Тап — стрибок через бар’єр. Хто перший до фінішу.',
    create(E) {
      const LEN = 9, SPD = 0.42, AIR = 0.5, RX = 0.2;
      const r = U.rng((Math.random() * 1e9) | 0);
      const fences = [];
      for (let x = 1.4; x < LEN - 0.5; x += r.range(0.75, 1.3)) fences.push(x);
      const S = {};
      return {
        init() {
          for (const p of E.players) S[p.id] = { d: 0, air: 0, slow: 0, plan: {} };
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            s.air = Math.max(0, s.air - dt);
            s.slow = Math.max(0, s.slow - dt);
            const v = SPD * (s.slow > 0 ? 0.25 : 1);
            const prev = s.d;
            s.d += v * dt;
            for (const f of fences) {
              if (prev < f - 0.02 && s.d >= f - 0.02 && s.air <= 0) {
                // зачепив бар'єр: спіткнувся
                s.slow = 0.9;
                s.d = f - 0.03;
                G.sfx('thud');
                E.shake(2);
              }
            }
            if (s.d >= LEN) return E.finish([p.id]);
          }
        },
        bot(p) {
          const s = S[p.id];
          if (s.air > 0) return;
          const next = fences.find((f) => f > s.d);
          if (next == null) return;
          if (s.plan[next] == null) s.plan[next] = AIR * 0.45 + U.gauss() * U.lerp(0.14, 0.04, E.skill);
          if ((next - s.d) / SPD < s.plan[next]) E.tap(p.id);
        },
        press(p) {
          const s = S[p.id];
          if (s.air > 0 || s.slow > 0.5) return;
          s.air = AIR;
          G.sfx('jump');
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h), gy = h * 0.72;
              g.fillStyle = '#7EC3E8';
              g.fillRect(0, 0, w, gy);
              g.fillStyle = '#5FA640';
              g.fillRect(0, gy, w, h - gy);
              g.fillStyle = '#4C8C33';
              for (let i = 0; i < 10; i++) {
                const x = ((i * 0.37 - s.d * 0.9) % 1.2 + 1.2) % 1.2;
                g.fillRect(x * w, gy + 8, 3, 6);
              }
              // бар'єри
              const scale = w * 0.9;
              for (const f of fences) {
                const x = RX * w + (f - s.d) * scale;
                if (x < -20 || x > w + 20) continue;
                g.fillStyle = '#fff';
                g.fillRect(x - 3, gy - m * 0.12, 6, m * 0.12);
                g.fillStyle = '#FF5468';
                g.fillRect(x - 8, gy - m * 0.12, 16, m * 0.025);
                g.fillRect(x - 8, gy - m * 0.06, 16, m * 0.025);
              }
              const fx = RX * w + (LEN - s.d) * scale;
              if (fx < w + 10) {
                for (let i = 0; i < 6; i++) {
                  g.fillStyle = i % 2 ? '#111' : '#eee';
                  g.fillRect(fx, gy - m * 0.3 + (i * m * 0.3) / 6, 6, (m * 0.3) / 6);
                }
              }
              // кінь
              const jump = s.air > 0 ? Math.sin((1 - s.air / AIR) * Math.PI) * m * 0.2 : Math.abs(Math.sin(E.t * 12)) * m * 0.01;
              g.save();
              g.translate(RX * w, gy - m * 0.08 - jump);
              g.scale(-1, 1);
              if (s.slow > 0) g.rotate(-0.3);
              E.emoji(g, '🐎', 0, 0, m * 0.18);
              g.restore();
              E.avatar(g, RX * w - m * 0.01, gy - m * 0.17 - jump, m * 0.045, p, s.slow > 0 ? 'hurt' : 'happy');
              // прогрес
              g.fillStyle = 'rgba(0,0,0,0.25)';
              g.fillRect(w * 0.1, h - 12, w * 0.8, 5);
              g.fillStyle = p.color.c;
              g.fillRect(w * 0.1, h - 12, w * 0.8 * Math.min(1, s.d / LEN), 5);
            });
          }
        },
      };
    },
  });
})();
