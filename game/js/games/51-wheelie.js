(function () {
  const { U } = G;
  G.game({
    id: 'wheelie', name: 'Віллі', icon: '🚲', tag: 'Баланс', bg: '#3B5C86', btn: 'ТРИМАЙ', lanes: true,
    verb: 'ТРИМАЙ БАЛАНС!',
    desc: 'Тримай — колесо вгору. Не перекинься й не опусти.',
    create(E) {
      const TOP = 1.45, BAL = 0.85, GRACE = 3;
      const S = {};
      return {
        init() {
          for (const p of E.players) S[p.id] = { th: 0, w: 0, x: 0, kick: 0, fell: 0, why: '' };
        },
        update(dt) {
          const dead = [];
          // поштовхи з часом сильнішають
          const bump = 0.6 + E.playT * 0.08;
          for (const p of E.alive()) {
            const s = S[p.id];
            s.kick -= dt;
            if (s.kick <= 0) {
              s.kick = U.rand(0.5, 1.4);
              if (s.up) s.w += U.rand(-1, 1) * bump;
            }
            const acc = (E.down[p.id] ? 5.2 : -5.2) + 2.6 * (s.th - BAL);
            s.w += acc * dt;
            s.w *= Math.exp(-0.6 * dt);
            s.th += s.w * dt;
            if (s.th < 0) {
              s.th = 0;
              s.w = Math.max(0, s.w);
            }
            if (s.th > 0.35) s.up = true;
            s.x += dt * (1.2 + E.playT * 0.04);
            if (s.th > TOP) {
              s.why = 'back';
              dead.push(p.id);
            } else if ((s.up || E.playT > GRACE) && s.th <= 0.02) {
              s.why = 'front';
              dead.push(p.id);
            }
          }
          for (const id of dead) {
            E.shake(5);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
          if (E.phase === 'play' && E.playT > 50) E.finish(E.alive().map((p) => p.id));
        },
        bot(p) {
          const s = S[p.id];
          if (s.re == null || E.t > s.re) {
            // бот реагує з затримкою
            s.re = E.t + U.lerp(0.18, 0.05, E.skill) * U.rand(0.6, 1.4);
            const tgt = BAL - 0.15 + U.gauss() * U.lerp(0.12, 0.03, E.skill);
            const pred = s.th + s.w * U.lerp(0.15, 0.35, E.skill);
            E.hold(p.id, pred < tgt);
          }
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id], out = E.out[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h), gy = h * 0.78;
              g.fillStyle = '#7EC3E8';
              g.fillRect(0, 0, w, gy);
              g.fillStyle = '#5A5A6E';
              g.fillRect(0, gy, w, h - gy);
              g.fillStyle = '#F6F1FF';
              for (let i = 0; i < 8; i++) {
                const x = (((i * 0.25 - s.x * 0.6) % 2) + 2) % 2;
                g.fillRect(x * w * 0.5, gy + (h - gy) * 0.45, w * 0.06, 3);
              }
              // велосипед: заднє колесо — опора
              const R = m * 0.12, rx = w * 0.32, ry = gy - R;
              const th = out ? (s.why === 'back' ? TOP + 0.6 : 0) : s.th;
              g.save();
              g.translate(rx, ry);
              g.rotate(-th);
              g.strokeStyle = '#1A1233';
              g.lineWidth = Math.max(2, m * 0.018);
              g.beginPath();
              g.arc(0, 0, R, 0, Math.PI * 2);
              g.moveTo(R * 3 + R, 0);
              g.arc(R * 3, 0, R, 0, Math.PI * 2);
              g.stroke();
              g.strokeStyle = p.color.c;
              g.lineWidth = Math.max(3, m * 0.03);
              g.beginPath();
              g.moveTo(0, 0);
              g.lineTo(R * 1.4, -R * 1.2);
              g.lineTo(R * 3, 0);
              g.moveTo(R * 1.4, -R * 1.2);
              g.lineTo(R * 2.6, -R * 1.6);
              g.stroke();
              E.avatar(g, R * 1.2, -R * 2.2, R * 0.75, p, out ? 'out' : s.th > BAL + 0.3 || s.th < 0.3 ? 'scared' : 'happy', th * 0.6);
              g.restore();
              if (out) E.outPanel(g, w, h, s.why === 'back' ? 'ПЕРЕКИНУВСЯ' : 'ОПУСТИВ');
            });
          }
        },
      };
    },
  });
})();
