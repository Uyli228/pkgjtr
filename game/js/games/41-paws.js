(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'paws', name: 'Лапи', icon: '🐾', tag: 'Реакція', bg: '#2A2018', btn: 'ЛАП',
    verb: 'ХАПАЙ РИБКУ!',
    desc: 'Тап — лапа хапає. Рибка +1, їжак −1. Хто перший 5.',
    create(E) {
      const WIN = 5;
      const sc = {}, paw = {}, botAt = {};
      let item = null, wait = 1.2;
      function spawn() {
        const hog = Math.random() < 0.3;
        item = { hog, ch: hog ? '🦔' : '🐟', t: 0, taken: null };
        E.players.forEach((p) => {
          const react = U.lerp(0.75, 0.32, E.skill) + U.rand(0, 0.3);
          botAt[p.id] = hog ? (Math.random() < (1 - E.skill) * 0.35 ? react : null) : react;
        });
      }
      return {
        init() {
          E.players.forEach((p) => {
            sc[p.id] = 0;
            paw[p.id] = { t: 0, stuck: 0 };
          });
        },
        update(dt) {
          for (const p of E.players) {
            const w = paw[p.id];
            w.t = Math.max(0, w.t - dt);
            w.stuck = Math.max(0, w.stuck - dt);
          }
          if (!item) {
            wait -= dt;
            if (wait <= 0) spawn();
            return;
          }
          item.t += dt;
          if (item.taken != null && item.t > item.takenAt + 0.6) {
            item = null;
            wait = U.rand(0.8, 2.2);
          } else if (item.taken == null && item.t > 2.2) {
            item = null;
            wait = U.rand(0.6, 1.6);
          }
        },
        bot(p) {
          if (!item || item.taken != null || botAt[p.id] == null) return;
          if (item.t >= botAt[p.id]) {
            botAt[p.id] = null;
            E.tap(p.id);
          }
        },
        press(p) {
          const w = paw[p.id];
          if (w.t > 0 || w.stuck > 0) return;
          w.t = 0.35;
          G.sfx('whoosh');
          if (!item || item.taken != null) {
            // махнув у порожнечу — лапа «застрягла»
            w.stuck = 0.7;
            return;
          }
          item.taken = p.id;
          item.takenAt = item.t;
          const h = E.home(p, 12 * E.arena.u);
          if (item.hog) {
            sc[p.id] = Math.max(0, sc[p.id] - 1);
            G.sfx('bad');
            E.shake(5);
            E.flash('#FF5468', 0.5);
            E.float(h.x, h.y, '−1 ОЙ!', '#FF5468', p.rot);
          } else {
            sc[p.id]++;
            G.sfx('coin');
            E.hitstop(0.05);
            E.float(h.x, h.y, '+1', p.color.l, p.rot);
            if (sc[p.id] >= WIN) E.finish([p.id]);
          }
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#E8DCC8';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 15 * u, 0, TAU);
          g.fill();
          g.strokeStyle = '#B9A88A';
          g.lineWidth = 1.2 * u;
          g.stroke();
          if (item) {
            let x = ar.cx, y = ar.cy;
            if (item.taken != null) {
              const k = Math.min(1, (item.t - item.takenAt) / 0.35);
              const h = E.home(E.byId(item.taken), 12 * u);
              x = U.lerp(ar.cx, h.x, k);
              y = U.lerp(ar.cy, h.y, k);
            }
            const pop = Math.min(1, item.t / 0.15);
            E.emoji(g, item.ch, x, y, 13 * u * pop);
          }
          for (const p of E.players) {
            const w = paw[p.id], h = E.home(p, 12 * u);
            const k = w.t > 0 ? Math.sin((1 - w.t / 0.35) * Math.PI) : 0;
            const px = U.lerp(h.x, ar.cx, k * 0.85), py = U.lerp(h.y, ar.cy, k * 0.85);
            g.strokeStyle = p.color.d;
            g.lineWidth = 6 * u;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(h.x, h.y);
            g.lineTo(px, py);
            g.stroke();
            g.lineCap = 'butt';
            g.fillStyle = p.color.c;
            g.beginPath();
            g.arc(px, py, 4.5 * u, 0, TAU);
            g.fill();
            g.fillStyle = '#FFB0C0';
            for (let i = -1; i <= 1; i++) {
              const a = Math.atan2(ar.cy - h.y, ar.cx - h.x) + i * 0.5;
              g.beginPath();
              g.arc(px + Math.cos(a) * 3.2 * u, py + Math.sin(a) * 3.2 * u, 1.1 * u, 0, TAU);
              g.fill();
            }
            E.avatar(g, h.x, h.y, 6 * u, p, w.stuck > 0 ? 'hurt' : item && item.taken === p.id ? (item.hog ? 'hurt' : 'happy') : 'sly', p.rot);
            E.hud(g, p, `${sc[p.id]} / ${WIN}`, { color: p.color.l });
          }
        },
      };
    },
  });
})();
