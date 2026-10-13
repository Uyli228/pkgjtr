(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'tanks', name: 'Танки', icon: '🛡️', tag: 'Перестрілка', bg: '#22261A', btn: 'ЇДЬ',
    verb: 'ЦІЛЬСЯ!',
    desc: 'Тримай — їдь, відпусти — постріл. 3 влучання — вибув.',
    create(E) {
      const SPIN = 2.4, SPD = 34, BSPD = 95, HP = 3, TIME = 50;
      const S = {};
      let shots = [];
      const R = () => 5 * E.arena.u;
      return {
        init() {
          const ar = E.arena;
          for (const p of E.players) {
            const h = E.home(p, 13 * ar.u);
            S[p.id] = { x: h.x, y: h.y, a: Math.atan2(ar.cy - h.y, ar.cx - h.x), hp: HP, cd: 0, hurt: 0, held: 0, dir: 1 };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u, r = R();
          for (const p of E.alive()) {
            const s = S[p.id];
            s.cd = Math.max(0, s.cd - dt);
            s.hurt = Math.max(0, s.hurt - dt);
            if (E.down[p.id]) {
              s.held += dt;
              s.x = U.clamp(s.x + Math.cos(s.a) * SPD * u * dt, ar.x + r, ar.x + ar.w - r);
              s.y = U.clamp(s.y + Math.sin(s.a) * SPD * u * dt, ar.y + r, ar.y + ar.h - r);
            } else s.a += SPIN * s.dir * dt;
          }
          // танки не проїжджають один крізь одного
          const al = E.alive();
          for (let i = 0; i < al.length; i++)
            for (let j = i + 1; j < al.length; j++) {
              const a = S[al[i].id], b = S[al[j].id];
              const d = U.dist(a.x, a.y, b.x, b.y);
              if (d < r * 2 && d > 0) {
                const k = (r * 2 - d) / 2 / d;
                a.x -= (b.x - a.x) * k;
                a.y -= (b.y - a.y) * k;
                b.x += (b.x - a.x) * k;
                b.y += (b.y - a.y) * k;
              }
            }
          const dead = [];
          for (const b of shots) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < ar.x || b.x > ar.x + ar.w || b.y < ar.y || b.y > ar.y + ar.h) b.dead = true;
            for (const p of E.alive()) {
              if (p.id === b.from || b.dead) continue;
              const s = S[p.id];
              if (U.dist(b.x, b.y, s.x, s.y) < r * 1.1) {
                b.dead = true;
                s.hp--;
                s.hurt = 0.4;
                E.burst(b.x, b.y, ['#FFC530', '#FF8A3D'], 14);
                E.shake(4);
                G.sfx('hit');
                if (s.hp <= 0) dead.push(p.id);
              }
            }
          }
          shots = shots.filter((b) => !b.dead);
          for (const id of dead) {
            E.burst(S[id].x, S[id].y, E.byId(id).color.c, 30, 1.2);
            E.eliminate(id);
          }
          if (dead.length && E.lastStanding(dead)) return;
          if (E.playT >= TIME) {
            const v = {};
            for (const p of E.alive()) v[p.id] = S[p.id].hp;
            E.finish(E.best(v, 'max'));
          }
        },
        release(p) {
          const s = S[p.id];
          s.held = 0;
          if (s.cd > 0) return;
          s.cd = 0.45;
          const u = E.arena.u, r = R();
          shots.push({ x: s.x + Math.cos(s.a) * r * 1.3, y: s.y + Math.sin(s.a) * r * 1.3, vx: Math.cos(s.a) * BSPD * u, vy: Math.sin(s.a) * BSPD * u, from: p.id });
          G.sfx('pop');
        },
        bot(p, dt) {
          const s = S[p.id], ar = E.arena;
          if (E.down[p.id]) {
            if (s.held > s.drive) E.hold(p.id, false);
            return;
          }
          let tgt = null, bd = Infinity;
          for (const q of E.alive()) {
            if (q.id === p.id) continue;
            const d = U.dist(s.x, s.y, S[q.id].x, S[q.id].y);
            if (d < bd) { bd = d; tgt = S[q.id]; }
          }
          if (!tgt) return;
          if (s.aimErr == null) s.aimErr = U.gauss() * U.lerp(0.35, 0.06, E.skill);
          const want = Math.atan2(tgt.y - s.y, tgt.x - s.x) + s.aimErr;
          const diff = Math.abs(U.angDiff(s.a, want));
          const nearWall = s.x < ar.x + 12 * ar.u || s.x > ar.x + ar.w - 12 * ar.u || s.y < ar.y + 12 * ar.u || s.y > ar.y + ar.h - 12 * ar.u;
          if (diff < 0.12 && s.cd <= 0) {
            s.drive = bd > 45 * ar.u ? U.rand(0.2, 0.5) : 0.05;
            s.aimErr = null;
            E.hold(p.id, true);
          } else if (nearWall && Math.abs(U.angDiff(s.a, Math.atan2(ar.cy - s.y, ar.cx - s.x))) < 0.3 && Math.random() < dt * 4) {
            s.drive = 0.4;
            E.hold(p.id, true);
          }
        },
        draw(g) {
          const u = E.arena.u, r = R();
          for (const p of E.players) {
            const s = S[p.id];
            if (E.out[p.id]) {
              g.globalAlpha = 0.35;
              E.emoji(g, '💥', s.x, s.y, r * 2);
              g.globalAlpha = 1;
              continue;
            }
            g.save();
            g.translate(s.x, s.y);
            g.rotate(s.a);
            g.fillStyle = p.color.d;
            U.rr(g, -r * 1.1, -r * 0.95, r * 2.2, r * 1.9, r * 0.35);
            g.fill();
            g.fillStyle = '#1A1233';
            g.fillRect(-r * 1.1, -r * 1.05, r * 2.2, r * 0.35);
            g.fillRect(-r * 1.1, r * 0.7, r * 2.2, r * 0.35);
            g.fillStyle = p.color.c;
            g.fillRect(0, -r * 0.2, r * 1.7, r * 0.4);
            g.restore();
            E.avatar(g, s.x, s.y, r * 0.75, p, s.hurt > 0 ? 'hurt' : 'sly', s.a + Math.PI / 2);
            // життя
            for (let i = 0; i < HP; i++) {
              g.fillStyle = i < s.hp ? p.color.l : 'rgba(255,255,255,0.18)';
              g.beginPath();
              g.arc(s.x + (i - 1) * r * 0.7, s.y - r * 1.6, r * 0.25, 0, TAU);
              g.fill();
            }
          }
          for (const b of shots) {
            g.fillStyle = '#FFE08A';
            g.beginPath();
            g.arc(b.x, b.y, 1.3 * u, 0, TAU);
            g.fill();
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
