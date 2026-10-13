(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'snowballs', name: 'Сніжки', icon: '☃️', tag: 'Перестрілка', bg: '#DCEAF5', btn: 'РУХ', input: 'stick',
    verb: 'КИДАЙ!',
    desc: 'Бігай джойстиком, відпусти — кидок. 3 влучання — вибув.',
    create(E) {
      const HP = 3, SPD = 38, BSPD = 80, RANGE = 75, TIME = 50;
      const S = {};
      let balls = [];
      const R = () => 5 * E.arena.u;
      function nearest(p) {
        const s = S[p.id];
        let t = null, bd = Infinity;
        for (const q of E.alive()) {
          if (q.id === p.id) continue;
          const d = U.dist(s.x, s.y, S[q.id].x, S[q.id].y);
          if (d < bd) { bd = d; t = S[q.id]; }
        }
        return { t, d: bd };
      }
      return {
        init() {
          const ar = E.arena;
          for (const p of E.players) {
            const h = E.home(p, 14 * ar.u);
            const a = Math.atan2(ar.cy - h.y, ar.cx - h.x);
            S[p.id] = { x: h.x, y: h.y, dx: Math.cos(a), dy: Math.sin(a), on: false, hp: HP, cd: 0, hurt: 0, plan: 0 };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = R();
          for (const p of E.alive()) {
            const s = S[p.id], st = E.stick[p.id];
            s.cd = Math.max(0, s.cd - dt);
            s.hurt = Math.max(0, s.hurt - dt);
            const l = Math.hypot(st.x, st.y);
            if (st.on && l > 0.2) {
              s.dx = st.x / l;
              s.dy = st.y / l;
            }
            const sp = SPD * u * (s.hurt > 0 ? 0.4 : 1);
            s.x = U.clamp(s.x + st.x * sp * dt, ar.x + r, ar.x + ar.w - r);
            s.y = U.clamp(s.y + st.y * sp * dt, ar.y + r, ar.y + ar.h - r);
            // відпустив джойстик — кидок у бік останнього руху
            if (s.on && !st.on && s.cd <= 0) {
              s.cd = 0.5;
              balls.push({ x: s.x + s.dx * r, y: s.y + s.dy * r, vx: s.dx * BSPD * u, vy: s.dy * BSPD * u, from: p.id, d: 0 });
              G.sfx('whoosh');
            }
            s.on = st.on;
          }
          const dead = [];
          for (const b of balls) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.d += Math.hypot(b.vx, b.vy) * dt;
            if (b.d > RANGE * u || b.x < ar.x || b.x > ar.x + ar.w || b.y < ar.y || b.y > ar.y + ar.h) {
              b.dead = true;
              E.burst(b.x, b.y, '#FFFFFF', 6, 0.5);
            }
            for (const p of E.alive()) {
              if (p.id === b.from || b.dead) continue;
              const s = S[p.id];
              if (U.dist(b.x, b.y, s.x, s.y) < r * 1.15) {
                b.dead = true;
                s.hp--;
                s.hurt = 0.6;
                E.burst(b.x, b.y, ['#FFFFFF', '#BFE3FF'], 18);
                E.shake(3);
                G.sfx('hit');
                if (s.hp <= 0) dead.push(p.id);
              }
            }
          }
          balls = balls.filter((b) => !b.dead);
          for (const id of dead) E.eliminate(id);
          if (dead.length && E.lastStanding(dead)) return;
          if (E.playT >= TIME) {
            const v = {};
            for (const p of E.alive()) v[p.id] = S[p.id].hp;
            E.finish(E.best(v, 'max'));
          }
        },
        bot(p, dt) {
          const s = S[p.id], u = E.arena.u, ar = E.arena;
          const { t, d } = nearest(p);
          if (!t) return E.setStick(p.id, 0, 0);
          s.plan -= dt;
          if (s.aim > 0) {
            s.aim -= dt;
            if (s.aim <= 0) return E.setStick(p.id, 0, 0); // відпустив = кидок
            const e = U.lerp(0.35, 0.05, E.skill);
            const ax = t.x - s.x, ay = t.y - s.y, a = Math.atan2(ay, ax) + (s.err || 0) * e;
            return E.setStick(p.id, Math.cos(a) * 0.6, Math.sin(a) * 0.6);
          }
          if (d < RANGE * u * 0.85 && s.cd <= 0 && s.plan <= 0) {
            s.aim = U.rand(0.12, 0.25);
            s.err = U.gauss();
            s.plan = U.lerp(2.4, 1.1, E.skill) * U.rand(0.7, 1.3);
            return;
          }
          // ухиляємось від сніжок і тримаємо дистанцію
          let mx = 0, my = 0;
          for (const b of balls) {
            if (b.from === p.id) continue;
            const bd = U.dist(b.x, b.y, s.x, s.y);
            if (bd < 25 * u && Math.random() < 0.3 + E.skill * 0.7) {
              mx += -b.vy / (BSPD * u);
              my += b.vx / (BSPD * u);
            }
          }
          const want = 45 * u;
          mx += ((s.x - t.x) / (d || 1)) * (d < want ? 1 : -0.6);
          my += ((s.y - t.y) / (d || 1)) * (d < want ? 1 : -0.6);
          mx += (ar.cx - s.x) / ar.w;
          my += (ar.cy - s.y) / ar.h;
          const l = Math.hypot(mx, my) || 1;
          E.setStick(p.id, mx / l, my / l);
        },
        draw(g) {
          const ar = E.arena, u = ar.u, r = R();
          g.fillStyle = '#C7DCEC';
          for (let i = 0; i < 9; i++) {
            const x = ar.x + ((i * 0.137 + 0.05) % 1) * ar.w, y = ar.y + ((i * 0.311 + 0.2) % 1) * ar.h;
            g.beginPath();
            g.ellipse(x, y, 9 * u, 3.5 * u, 0, 0, TAU);
            g.fill();
          }
          for (const p of E.players) {
            const s = S[p.id];
            if (E.out[p.id]) {
              E.emoji(g, '☃️', s.x, s.y, r * 2.2);
              continue;
            }
            g.strokeStyle = U.alpha(p.color.c, 0.5);
            g.lineWidth = 0.8 * u;
            g.beginPath();
            g.moveTo(s.x + s.dx * r * 1.2, s.y + s.dy * r * 1.2);
            g.lineTo(s.x + s.dx * r * 2, s.y + s.dy * r * 2);
            g.stroke();
            E.avatar(g, s.x, s.y, r, p, s.hurt > 0 ? 'hurt' : 'sly');
            for (let i = 0; i < HP; i++) {
              g.fillStyle = i < s.hp ? p.color.c : 'rgba(0,0,0,0.15)';
              g.beginPath();
              g.arc(s.x + (i - 1) * r * 0.7, s.y - r * 1.5, r * 0.25, 0, TAU);
              g.fill();
            }
          }
          for (const b of balls) {
            g.fillStyle = '#fff';
            g.strokeStyle = '#8FB4D0';
            g.lineWidth = 1;
            g.beginPath();
            g.arc(b.x, b.y, 1.8 * u, 0, TAU);
            g.fill();
            g.stroke();
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME, '#5B7FA0');
        },
      };
    },
  });
})();
