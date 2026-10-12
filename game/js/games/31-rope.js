(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'rope', name: 'Скакалка', icon: '🪢', tag: 'Ритм', bg: '#1E2A1A', btn: 'СТРИБОК',
    verb: 'СТРИБАЙ!',
    desc: 'Тап — стрибок. Перестрибни мотузку. Зачепився — вибув.',
    create(E) {
      const AIR = 0.45;
      const S = {};
      let a = 0, w = 1.7, surge = 0;
      const angOf = (p) => {
        const h = E.home(p, 15 * E.arena.u);
        return Math.atan2(h.y - E.arena.cy, h.x - E.arena.cx);
      };
      return {
        init() {
          a = Math.random() * TAU;
          for (const p of E.players) S[p.id] = { air: 0, cd: 0, prev: U.angDiff(a, angOf(p)), plan: U.rand(0.1, 0.25) };
        },
        update(dt) {
          surge -= dt;
          if (surge <= 0) surge = U.rand(2, 4);
          const speed = (2.2 + E.playT * 0.32) * (surge < 0.6 ? 1.35 : 1);
          w = speed;
          a += w * dt;
          const dead = [];
          for (const p of E.alive()) {
            const s = S[p.id];
            s.air = Math.max(0, s.air - dt);
            s.cd = Math.max(0, s.cd - dt);
            const d = U.angDiff(a, angOf(p));
            // мотузка проходить через гравця, коли знак різниці кутів змінюється з + на −
            if (s.prev > 0 && d <= 0 && Math.abs(d) < 1) {
              if (s.air <= 0) dead.push(p.id);
              else G.sfx('tap', 2);
            }
            s.prev = d;
          }
          for (const id of dead) {
            const p = E.byId(id), h = E.home(p, 15 * E.arena.u);
            E.burst(h.x, h.y, p.color.c, 20);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
        },
        bot(p) {
          const s = S[p.id];
          if (s.air > 0 || s.cd > 0) return;
          const d = U.angDiff(a, angOf(p));
          if (d > 0 && d / w < s.plan + U.gauss() * U.lerp(0.16, 0.06, E.skill)) {
            E.tap(p.id);
            s.plan = U.rand(0.08, 0.22);
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.air > 0 || s.cd > 0) return;
          s.air = AIR;
          s.cd = AIR + 0.12;
          G.sfx('jump');
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // земля
          g.fillStyle = '#243320';
          g.beginPath();
          g.arc(ar.cx, ar.cy, Math.hypot(ar.w, ar.h) / 2, 0, TAU);
          g.fill();
          g.fillStyle = '#2C3D27';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 26 * u, 0, TAU);
          g.fill();
          // мотузка — від центру до краю
          const L = Math.hypot(ar.w, ar.h);
          g.strokeStyle = '#FFC530';
          g.lineWidth = 1.6 * u;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(ar.cx, ar.cy);
          g.quadraticCurveTo(
            ar.cx + Math.cos(a - 0.12) * L * 0.25, ar.cy + Math.sin(a - 0.12) * L * 0.25,
            ar.cx + Math.cos(a) * L * 0.6, ar.cy + Math.sin(a) * L * 0.6
          );
          g.stroke();
          g.lineCap = 'butt';
          g.fillStyle = '#8A5A3C';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 4 * u, 0, TAU);
          g.fill();
          for (const p of E.players) {
            const s = S[p.id], h = E.home(p, 15 * u);
            const jump = s.air > 0 ? Math.sin((1 - s.air / AIR) * Math.PI) * 6 * u : 0;
            g.fillStyle = 'rgba(0,0,0,0.25)';
            g.beginPath();
            g.ellipse(h.x, h.y + 6 * u, 5 * u * (1 - jump / (12 * u)), 1.5 * u, 0, 0, TAU);
            g.fill();
            const close = Math.abs(U.angDiff(a, angOf(p))) < 0.6;
            E.avatar(g, h.x, h.y - jump * (p.rot ? -1 : 1), 6.5 * u, p, E.out[p.id] ? 'out' : s.air > 0 ? 'happy' : close ? 'scared' : 'idle', p.rot);
          }
        },
      };
    },
  });
})();
