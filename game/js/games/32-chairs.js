(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'chairs', name: 'Стільці', icon: '🪑', tag: 'Реакція', bg: '#2A1C2E', btn: 'СІСТИ',
    verb: 'СІДАЙ!',
    desc: 'Музика стихла — тисни, щоб сісти. Без стільця — вибув.',
    create(E) {
      let st = 'music', t = 0, stopAt = 3, beat = 0, walk = 0, chairs = [], seated = {}, botAt = {};
      function round() {
        st = 'music';
        t = 0;
        stopAt = U.rand(2, 5);
        const n = E.alive().length - 1;
        chairs = Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + Math.PI / 2, who: null }));
        seated = {};
      }
      const pos = (k, off = 0) => {
        const ar = E.arena, r = 26 * ar.u;
        const ang = (k / E.n) * TAU + walk + off;
        return { x: ar.cx + Math.cos(ang) * r, y: ar.cy + Math.sin(ang) * r };
      };
      return {
        init() {
          round();
        },
        update(dt) {
          t += dt;
          if (st === 'music') {
            walk += dt * 1.2;
            beat -= dt;
            if (beat <= 0) {
              G.sfx(Math.random() < 0.5 ? 'note' : 'kick', U.pick([523, 587, 659, 784]));
              beat = 0.3;
            }
            if (t >= stopAt) {
              st = 'grab';
              t = 0;
              G.sfx('alarm');
              E.flash('#FFFFFF', 0.5);
              E.players.forEach((p) => (botAt[p.id] = U.lerp(0.75, 0.3, E.skill) + U.rand(0, 0.35)));
            }
          } else if (st === 'grab') {
            const free = chairs.filter((c) => c.who == null);
            const standing = E.alive().filter((p) => seated[p.id] == null);
            if (!free.length || t > 4) {
              for (const p of standing) {
                E.eliminate(p.id);
                E.shake(6);
              }
              st = 'end';
              t = 0;
              if (E.lastStanding()) return;
            }
          } else if (st === 'end' && t > 1.4) round();
        },
        bot(p) {
          if (st === 'grab' && seated[p.id] == null && t >= botAt[p.id]) E.tap(p.id);
        },
        press(p) {
          if (st !== 'grab' || seated[p.id] != null) return;
          const free = chairs.filter((c) => c.who == null);
          if (!free.length) return;
          // найближчий вільний стілець
          const me = pos(E.alive().indexOf(p));
          const ar = E.arena;
          free.sort((a, b) => {
            const pa = { x: ar.cx + Math.cos(a.a) * 14 * ar.u, y: ar.cy + Math.sin(a.a) * 14 * ar.u };
            const pb = { x: ar.cx + Math.cos(b.a) * 14 * ar.u, y: ar.cy + Math.sin(b.a) * 14 * ar.u };
            return U.dist(me.x, me.y, pa.x, pa.y) - U.dist(me.x, me.y, pb.x, pb.y);
          });
          free[0].who = p.id;
          seated[p.id] = free[0];
          G.sfx('thud');
          E.hitstop(0.05);
        },
        label(p) {
          if (st === 'music') return 'ЧЕКАЙ…';
          return seated[p.id] ? 'СИДЖУ ✓' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#33223A';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 34 * u, 0, TAU);
          g.fill();
          for (const c of chairs) {
            const x = ar.cx + Math.cos(c.a) * 14 * u, y = ar.cy + Math.sin(c.a) * 14 * u;
            g.fillStyle = '#A8763E';
            U.rr(g, x - 4.5 * u, y - 4.5 * u, 9 * u, 9 * u, 1.5 * u);
            g.fill();
            g.fillStyle = '#6E4A22';
            g.fillRect(x - 4.5 * u, y - 4.5 * u, 9 * u, 2 * u);
          }
          const al = E.alive();
          al.forEach((p, k) => {
            let x, y;
            if (seated[p.id]) {
              const c = seated[p.id];
              x = ar.cx + Math.cos(c.a) * 14 * u;
              y = ar.cy + Math.sin(c.a) * 14 * u;
            } else ({ x, y } = pos(k));
            const mood = st === 'music' ? 'happy' : seated[p.id] ? 'sly' : st === 'end' ? 'hurt' : 'scared';
            E.avatar(g, x, y, 6 * u, p, mood);
          });
          for (const p of E.players) if (E.out[p.id]) E.avatar(g, E.home(p, 12 * u).x, E.home(p, 12 * u).y, 5.5 * u, p, 'out', p.rot);
          if (st === 'music') {
            const k = (E.t * 3.3) % 1;
            g.globalAlpha = 1 - k;
            E.emoji(g, '🎵', ar.cx + Math.sin(E.t * 2) * 10 * u, ar.cy - k * 12 * u, 7 * u);
            g.globalAlpha = 1;
          } else if (st === 'grab') {
            E.dual(g, (x, y) => E.txt(g, 'СІДАЙ!', x, y, 9 * u, '#FFC530', { stroke: '#2A1C2E' }), 40 * u, true);
          }
        },
      };
    },
  });
})();
