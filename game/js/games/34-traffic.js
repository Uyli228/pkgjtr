(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'traffic', name: 'Світлофор', icon: '🚦', tag: 'Обережність', bg: '#1C2333', btn: 'БІЖИ', lanes: true,
    verb: 'ЗЕЛЕНИЙ — БІЖИ!',
    desc: 'Тримай — біжиш. Червоний — відпусти, або назад на старт.',
    create(E) {
      const S = {};
      let light = 'green', lt = 0, ldur = 2.5;
      function setLight(l) {
        light = l;
        lt = 0;
        ldur = l === 'green' ? U.rand(1.5, 3.5) : l === 'yellow' ? 0.7 : U.rand(1.4, 2.8);
        if (l === 'red') E.flash('#FF5468', 0.3);
        if (l === 'yellow') for (const p of E.players) S[p.id].react = U.rand(0.1, 0.55) * (1.3 - E.skill * 0.8);
      }
      return {
        init() {
          for (const p of E.players) S[p.id] = { y: 0, back: 0, react: 0.3 };
          setLight('green');
        },
        update(dt) {
          lt += dt;
          if (lt >= ldur) setLight(light === 'green' ? 'yellow' : light === 'yellow' ? 'red' : 'green');
          for (const p of E.players) {
            const s = S[p.id];
            if (s.back > 0) {
              s.back -= dt;
              s.y = Math.max(0, s.y - dt * 1.2);
              continue;
            }
            if (!E.down[p.id]) continue;
            if (light === 'red' && lt > 0.2) {
              s.back = 0.8;
              E.shake(4);
              G.sfx('bad');
              continue;
            }
            s.y += dt / 5;
            if (s.y >= 1) return E.finish([p.id]);
          }
        },
        bot(p) {
          const s = S[p.id];
          let want = light === 'green' && s.back <= 0;
          if (light === 'yellow') want = lt < s.react * 0.5;
          if (light === 'red') want = lt < s.react - 0.4;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        label(p) {
          return S[p.id].back > 0 ? 'НАЗАД!' : null;
        },
        draw(g) {
          const col = light === 'green' ? '#35D486' : light === 'yellow' ? '#FFC530' : '#FF5468';
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              g.fillStyle = '#26304A';
              g.fillRect(0, 0, w, h);
              g.fillStyle = '#323E5E';
              g.fillRect(w * 0.3, 0, w * 0.4, h);
              // фініш
              for (let i = 0; i < 8; i++) {
                g.fillStyle = i % 2 ? '#111' : '#eee';
                g.fillRect(w * 0.3 + (i * w * 0.4) / 8, h * 0.18, (w * 0.4) / 8, m * 0.03);
              }
              // світлофор
              const lx = w * 0.15, ly = h * 0.1;
              g.fillStyle = '#111';
              U.rr(g, lx - m * 0.06, ly - m * 0.06, m * 0.12, m * 0.3, m * 0.03);
              g.fill();
              ['#FF5468', '#FFC530', '#35D486'].forEach((c, i) => {
                g.beginPath();
                g.arc(lx, ly + i * m * 0.09, m * 0.035, 0, TAU);
                g.fillStyle = c === col ? c : U.alpha(c, 0.18);
                g.fill();
              });
              // бігун
              const y = h * 0.9 - s.y * h * 0.72;
              const bob = E.down[p.id] && s.back <= 0 ? Math.abs(Math.sin(E.t * 14)) * m * 0.02 : 0;
              E.avatar(g, w / 2, y - bob, m * 0.07, p, s.back > 0 ? 'hurt' : light === 'red' ? 'scared' : E.down[p.id] ? 'happy' : 'idle');
            });
          }
          // великий сигнал по центру — видно всім
          const ar = E.arena;
          g.fillStyle = col;
          g.globalAlpha = 0.9;
          g.beginPath();
          g.arc(ar.cx, ar.cy, 5 * ar.u, 0, TAU);
          g.fill();
          g.globalAlpha = 1;
        },
      };
    },
  });
})();
