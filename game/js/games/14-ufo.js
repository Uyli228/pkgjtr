(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'ufo', name: 'НЛО-збирачі', icon: '🛸', tag: 'Керування', bg: '#0D0B22', btn: 'ПОВОРОТ',
    verb: 'ЛОВИ ЗІРКИ', desc: 'Тримай — поворот. Збери найбільше зірок.',
    create(E) {
      const TIME = 30;
      const ufos = {}, sc = {};
      let stars = [], holes = [], bg = [];
      function spawnStar() {
        const ar = E.arena, u = ar.u;
        for (let i = 0; i < 20; i++) {
          const x = ar.x + U.rand(0.1, 0.9) * ar.w, y = ar.y + U.rand(0.1, 0.9) * ar.h;
          if (holes.every((h) => U.dist(x, y, h.x, h.y) > 16 * u)) return { x, y, ph: Math.random() * TAU, big: false };
        }
        return { x: ar.cx, y: ar.cy, ph: 0, big: false };
      }
      function respawn(p, f) {
        const s = E.home(p, (p.corner ? 10 : 8) * E.arena.u);
        Object.assign(f, { x: s.x, y: s.y, a: p.ang, inv: 1.6 });
      }
      return {
        init() {
          const ar = E.arena, u = ar.u;
          for (let i = 0; i < 50; i++) bg.push({ x: Math.random(), y: Math.random(), s: Math.random() });
          const nh = E.n >= 3 ? 2 : 1;
          for (let i = 0; i < nh; i++) {
            const a = Math.random() * TAU;
            holes.push({ x: ar.cx + (i ? 1 : -1) * ar.w * 0.18, y: ar.cy + (i ? -1 : 1) * ar.h * 0.1, vx: Math.cos(a) * 6 * u, vy: Math.sin(a) * 6 * u });
          }
          for (let i = 0; i < 5; i++) stars.push(spawnStar());
          for (const p of E.players) {
            sc[p.id] = 0;
            ufos[p.id] = { vx: 0, vy: 0 };
            respawn(p, ufos[p.id]);
            ufos[p.id].inv = 0;
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u;
          const SPD = 24 * u, TURN = 3.3, R = 4.5 * u;
          // чорні діри
          for (const h of holes) {
            h.x += h.vx * dt;
            h.y += h.vy * dt;
            const m = 12 * u;
            if (h.x < ar.x + m || h.x > ar.x + ar.w - m) h.vx *= -1;
            if (h.y < ar.y + m || h.y > ar.y + ar.h - m) h.vy *= -1;
            h.x = U.clamp(h.x, ar.x + m, ar.x + ar.w - m);
            h.y = U.clamp(h.y, ar.y + m, ar.y + ar.h - m);
          }
          for (const p of E.players) {
            const f = ufos[p.id];
            f.inv = Math.max(0, f.inv - dt);
            if (E.down[p.id]) f.a -= TURN * dt;
            let vx = Math.cos(f.a) * SPD, vy = Math.sin(f.a) * SPD;
            // гравітація дір
            for (const h of holes) {
              const d = U.dist(f.x, f.y, h.x, h.y);
              if (d < 20 * u && f.inv <= 0) {
                vx += ((h.x - f.x) / d) * 9 * u;
                vy += ((h.y - f.y) / d) * 9 * u;
              }
              if (d < 6 * u && f.inv <= 0) {
                const lost = 0;
                sc[p.id] -= lost;
                for (let i = 0; i < lost; i++) {
                  const s = spawnStar();
                  stars.push(s);
                }
                G.sfx('bad');
                E.burst(f.x, f.y, p.color.c, 16);
                if (lost) E.float(f.x, f.y, '−' + lost, '#FF5468', p.rot);
                respawn(p, f);
                vx = vy = 0;
              }
            }
            f.x += (vx + f.vx) * dt;
            f.y += (vy + f.vy) * dt;
            f.vx *= Math.exp(-4 * dt);
            f.vy *= Math.exp(-4 * dt);
            // стіни
            if (f.x < ar.x + R) { f.x = ar.x + R; f.a = Math.PI - f.a; }
            if (f.x > ar.x + ar.w - R) { f.x = ar.x + ar.w - R; f.a = Math.PI - f.a; }
            if (f.y < ar.y + R) { f.y = ar.y + R; f.a = -f.a; }
            if (f.y > ar.y + ar.h - R) { f.y = ar.y + ar.h - R; f.a = -f.a; }
            // зірки
            for (let i = stars.length - 1; i >= 0; i--) {
              const s = stars[i];
              if (U.dist(f.x, f.y, s.x, s.y) < R + 3 * u) {
                const v = s.big ? 3 : 1;
                sc[p.id] += v;
                stars.splice(i, 1);
                G.sfx('coin');
                E.float(s.x, s.y, '+' + v, p.color.l, p.rot);
                E.after(U.rand(0.2, 0.8), () => stars.push(spawnStar()));
              }
            }
          }
          // зіткнення тарілок
          for (let i = 0; i < E.players.length; i++) {
            for (let j = i + 1; j < E.players.length; j++) {
              const a = ufos[E.players[i].id], b = ufos[E.players[j].id];
              const d = U.dist(a.x, a.y, b.x, b.y);
              if (d < R * 2 && d > 0) {
                const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
                const push = (R * 2 - d) / 2;
                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
                a.vx -= nx * 25 * u;
                a.vy -= ny * 25 * u;
                b.vx += nx * 25 * u;
                b.vy += ny * 25 * u;
                G.sfx('thud');
              }
            }
          }
          if (E.playT >= TIME) E.finish(E.best(sc, 'max'));
        },
        bot(p) {
          const f = ufos[p.id], u = E.arena.u;
          let target = null, bd = Infinity;
          for (const s of stars) {
            const d = U.dist(f.x, f.y, s.x, s.y);
            const da = U.angDiff(f.a, Math.atan2(s.y - f.y, s.x - f.x));
            const cost = d + (da > 0 ? (TAU - da) : -da) * 8 * u - (s.big ? 12 * u : 0);
            if (cost < bd) {
              bd = cost;
              target = s;
            }
          }
          let want = false;
          if (target) {
            const da = U.angDiff(f.a, Math.atan2(target.y - f.y, target.x - f.x));
            want = da < -0.12 + (1 - E.skill) * 0.1 || da > 1.4;
          }
          for (const h of holes) {
            const d = U.dist(f.x, f.y, h.x, h.y);
            const da = Math.abs(U.angDiff(f.a, Math.atan2(h.y - f.y, h.x - f.x)));
            if (d < 22 * u && da < 0.7 && Math.random() < 0.5 + E.skill * 0.5) want = true;
          }
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          for (const s of bg) {
            g.fillStyle = `rgba(255,255,255,${0.15 + s.s * 0.4})`;
            g.fillRect(ar.x + s.x * ar.w, ar.y + s.y * ar.h, 1 + s.s * 1.5, 1 + s.s * 1.5);
          }
          for (const h of holes) {
            for (let i = 4; i >= 1; i--) {
              g.beginPath();
              g.arc(h.x, h.y, i * 4.5 * u, 0, TAU);
              g.fillStyle = `rgba(122,77,255,${0.08 * (5 - i)})`;
              g.fill();
            }
            g.beginPath();
            g.arc(h.x, h.y, 5.5 * u, 0, TAU);
            g.fillStyle = '#000';
            g.fill();
            g.strokeStyle = '#B79CFF';
            g.lineWidth = 0.5 * u;
            g.beginPath();
            g.arc(h.x, h.y, 7 * u, E.t * 3, E.t * 3 + 2);
            g.stroke();
          }
          for (const s of stars) {
            const r = (s.big ? 4.5 : 3) * u * (1 + 0.12 * Math.sin(E.t * 5 + s.ph));
            g.fillStyle = s.big ? '#FFC530' : '#FFE7A3';
            g.beginPath();
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * TAU - Math.PI / 2 + E.t * 0.5;
              const rr = i % 2 ? r * 0.45 : r;
              g.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
            }
            g.fill();
          }
          for (const p of E.players) {
            const f = ufos[p.id];
            if (f.inv > 0 && Math.floor(E.t * 12) % 2) continue;
            g.save();
            g.translate(f.x, f.y);
            g.rotate(f.a);
            g.fillStyle = U.alpha(p.color.l, 0.5);
            g.beginPath();
            g.moveTo(-4 * u, -1.5 * u);
            g.lineTo(-8 * u - Math.random() * 2 * u, 0);
            g.lineTo(-4 * u, 1.5 * u);
            g.fill();
            g.fillStyle = p.color.d;
            g.beginPath();
            g.ellipse(0, 0, 5 * u, 3.6 * u, 0, 0, TAU);
            g.fill();
            g.fillStyle = p.color.c;
            g.beginPath();
            g.ellipse(0, 0, 4.4 * u, 3 * u, 0, 0, TAU);
            g.fill();
            g.fillStyle = 'rgba(220,240,255,0.85)';
            g.beginPath();
            g.arc(0.6 * u, 0, 1.7 * u, 0, TAU);
            g.fill();
            g.restore();
            E.hud(g, p, '★ ' + sc[p.id], { color: p.color.l });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
