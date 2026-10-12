(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'balloon', name: 'Повітряна кулька', icon: '🎈', tag: 'Ризик', bg: '#1A1840', btn: 'КАЧАЙ', lanes: true,
    verb: 'НЕ ЛУСНИ', desc: 'Тап — накачати. Найбільша кулька виграє. Тремтить — значить, скоро лусне.',
    create(E) {
      const TIME = 12;
      const S = {};
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { s: 0.16, pop: U.rand(0.55, 1.0), popped: false, pumpT: 0, stopAt: 0, botT: U.rand(0.2, 0.6), shards: [] };
            const s = S[p.id];
            // бот бачить тремтіння і зупиняється з певним ризиком
            s.stopAt = s.pop - 0.12 + U.rand(-0.02, 0.1) * (0.7 + (1 - E.skill) * 0.8);
          }
        },
        update(dt) {
          for (const p of E.players) {
            const s = S[p.id];
            s.pumpT = Math.max(0, s.pumpT - dt * 4);
            for (const q of s.shards) {
              q.vy += 1.4 * dt;
              q.x += q.vx * dt;
              q.y += q.vy * dt;
              q.r += q.vr * dt;
            }
          }
          if (E.playT >= TIME) {
            const v = {};
            for (const p of E.players) if (!S[p.id].popped) v[p.id] = Math.round(S[p.id].s * 1000) / 1000;
            const w = E.best(v, 'max');
            E.finish(w, w.length ? 'Розмір: ' + Math.round(S[w[0]].s * 100) + '%' : 'Усі кульки лопнули');
          } else if (E.alive().length === 0) E.finish([], 'Усі кульки лопнули');
        },
        bot(p, dt) {
          const s = S[p.id];
          s.botT -= dt;
          if (s.botT > 0 || s.s >= s.stopAt) return;
          E.tap(p.id);
          s.botT = U.rand(0.18, 0.34);
        },
        press(p) {
          const s = S[p.id];
          if (s.popped) return;
          s.s += U.rand(0.032, 0.05);
          s.pumpT = 1;
          G.sfx('pump', s.s);
          if (s.s >= s.pop) {
            s.popped = true;
            G.sfx('pop');
            E.shake(5);
            for (let i = 0; i < 12; i++) {
              const a = Math.random() * TAU;
              s.shards.push({ x: 0, y: 0, vx: Math.cos(a) * U.rand(0.3, 0.9), vy: Math.sin(a) * U.rand(0.3, 0.9), r: 0, vr: U.rand(-8, 8) });
            }
            E.eliminate(p.id);
          }
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h * 0.78);
              g.fillStyle = '#1A1840';
              g.fillRect(0, 0, w, h);
              // хмарки
              g.fillStyle = 'rgba(255,255,255,0.05)';
              g.beginPath();
              g.arc(w * 0.2, h * 0.2, m * 0.08, 0, TAU);
              g.arc(w * 0.28, h * 0.18, m * 0.1, 0, TAU);
              g.arc(w * 0.8, h * 0.35, m * 0.07, 0, TAU);
              g.fill();
              const pumpY = h * 0.9;
              const R = s.s * m * 0.4;
              const cx = w / 2, cy = pumpY - h * 0.1 - R * 1.05;
              // насос
              g.fillStyle = '#4A4468';
              g.fillRect(cx - m * 0.06, pumpY - h * 0.02, m * 0.12, h * 0.1);
              g.fillStyle = '#8D86B0';
              g.fillRect(cx - m * 0.1, pumpY - h * 0.03 - s.pumpT * h * 0.025, m * 0.2, h * 0.025);
              g.strokeStyle = '#C9C2EA';
              g.lineWidth = 2;
              g.beginPath();
              g.moveTo(cx, pumpY - h * 0.02);
              g.lineTo(cx, cy + R);
              g.stroke();
              if (!s.popped) {
                const near = U.clamp((s.s - (s.pop - 0.12)) / 0.12, 0, 1);
                const jit = near * m * 0.012;
                const jx = U.rand(-1, 1) * jit, jy = U.rand(-1, 1) * jit;
                g.fillStyle = p.color.c;
                g.beginPath();
                g.ellipse(cx + jx, cy + jy, R * 0.92, R * 1.05, 0, 0, TAU);
                g.fill();
                g.fillStyle = p.color.d;
                g.beginPath();
                g.moveTo(cx - R * 0.12 + jx, cy + R * 1.08 + jy);
                g.lineTo(cx + R * 0.12 + jx, cy + R * 1.08 + jy);
                g.lineTo(cx + jx, cy + R * 0.95 + jy);
                g.fill();
                g.fillStyle = 'rgba(255,255,255,0.35)';
                g.beginPath();
                g.ellipse(cx - R * 0.38 + jx, cy - R * 0.45 + jy, R * 0.16, R * 0.28, -0.5, 0, TAU);
                g.fill();
              } else {
                for (const q of s.shards) {
                  g.save();
                  g.translate(cx + q.x * m * 0.6, cy + q.y * m * 0.6);
                  g.rotate(q.r);
                  g.fillStyle = p.color.c;
                  g.fillRect(-m * 0.03, -m * 0.012, m * 0.06, m * 0.024);
                  g.restore();
                }
              }
              if (E.phase === 'play') {
                const f = 1 - E.playT / TIME;
                g.fillStyle = 'rgba(255,255,255,0.12)';
                g.fillRect(w * 0.1, h * 0.05, w * 0.8, 5);
                g.fillStyle = f < 0.25 ? '#FF5468' : '#F6F1FF';
                g.fillRect(w * 0.1, h * 0.05, w * 0.8 * f, 5);
              }
              if (E.phase === 'result' || E.phase === 'done') {
                E.txt(g, s.popped ? 'ЛОП!' : Math.round(s.s * 100) + '%', w / 2, h * 0.13, m * 0.1, '#fff', { stroke: 'rgba(0,0,0,0.5)' });
              }
              if (s.popped && E.phase === 'play') E.txt(g, 'ЛОП!', w / 2, h * 0.4, m * 0.12, '#FF5468', { stroke: 'rgba(0,0,0,0.5)' });
            });
          }
        },
      };
    },
  });
})();
