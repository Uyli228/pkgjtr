(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'snakes', name: 'Змійки', icon: '🐍', tag: 'Виживання', bg: '#14281F', btn: 'ПОВОРОТ',
    verb: 'НЕ ВРІЖСЯ!',
    desc: 'Тримай — повертаєш. Не врізайся у змійок. Останній виграв.',
    create(E) {
      const SPD = 21, TURN = 3.3, GAP = 1.4, TIME = 45;
      const S = {};
      let apple = null;
      const R = () => 1.9 * E.arena.u;
      function placeApple() {
        const ar = E.arena;
        for (let k = 0; k < 30; k++) {
          const x = ar.x + U.rand(0.1, 0.9) * ar.w, y = ar.y + U.rand(0.12, 0.88) * ar.h;
          if (!hit(x, y, -1, 5 * ar.u)) return (apple = { x, y, t: 0 });
        }
        apple = { x: ar.cx, y: ar.cy, t: 0 };
      }
      // чи є щось небезпечне в точці (стіна або тіло змійки)
      function hit(x, y, self, rad) {
        for (const p of E.players) {
          if (E.out[p.id]) continue;
          const b = S[p.id].body;
          const skip = p.id === self ? 8 : 0;
          for (let i = 0; i < b.length - skip; i++) if (Math.abs(b[i].x - x) < rad && Math.abs(b[i].y - y) < rad && U.dist(b[i].x, b[i].y, x, y) < rad) return true;
        }
        return false;
      }
      // стін немає: виїхав за край — з'явився з протилежного боку
      function wrap(o) {
        const ar = E.arena;
        if (o.x < ar.x) o.x += ar.w;
        else if (o.x > ar.x + ar.w) o.x -= ar.w;
        if (o.y < ar.y) o.y += ar.h;
        else if (o.y > ar.y + ar.h) o.y -= ar.h;
        return o;
      }
      return {
        init() {
          const ar = E.arena;
          for (const p of E.players) {
            const h = E.home(p, 14 * ar.u);
            const a = Math.atan2(ar.cy - h.y, ar.cx - h.x) + Math.PI / 2 - 0.3;
            S[p.id] = { x: h.x, y: h.y, a, len: 22, body: [{ x: h.x, y: h.y }], acc: 0, eaten: 0 };
          }
          placeApple();
        },
        update(dt) {
          const u = E.arena.u, sp = SPD * u * (1 + Math.min(0.6, E.playT / 40));
          apple.t += dt;
          const dead = [];
          for (const p of E.alive()) {
            const s = S[p.id];
            if (E.down[p.id]) s.a += TURN * dt;
            s.len += dt * 4; // змійки ростуть самі — поле тіснішає
            s.x += Math.cos(s.a) * sp * dt;
            s.y += Math.sin(s.a) * sp * dt;
            wrap(s);
            s.acc += sp * dt;
            while (s.acc >= GAP * u) {
              s.acc -= GAP * u;
              s.body.push({ x: s.x, y: s.y });
              if (s.body.length > s.len) s.body.shift();
            }
            if (U.dist(s.x, s.y, apple.x, apple.y) < 4.5 * u) {
              s.len += 8;
              s.eaten++;
              G.sfx('coin');
              E.float(apple.x, apple.y, '+1', p.color.l, p.rot);
              placeApple();
            }
          }
          for (const p of E.alive()) {
            const s = S[p.id];
            if (hit(s.x, s.y, p.id, R() * 1.4)) dead.push(p.id);
          }
          for (const id of dead) {
            const s = S[id];
            E.burst(s.x, s.y, E.byId(id).color.c, 24);
            E.shake(5);
            E.eliminate(id);
          }
          if (dead.length) {
            // загинули одночасно — перемагає довша
            const v = {};
            for (const id of dead) v[id] = S[id].len;
            if (E.lastStanding(E.best(v, 'max'))) return;
          }
          if (E.playT >= TIME) {
            const v = {};
            for (const p of E.alive()) v[p.id] = S[p.id].len;
            E.finish(E.best(v, 'max'));
          }
        },
        bot(p) {
          const s = S[p.id], u = E.arena.u;
          if (s.think > E.t) return;
          s.think = E.t + U.lerp(0.16, 0.04, E.skill);
          const sp = SPD * u * (1 + Math.min(0.6, E.playT / 40));
          // скільки кроків уперед вільно, якщо їхати прямо або повертати
          const free = (turn) => {
            const o = { x: s.x, y: s.y };
            let a = s.a;
            for (let k = 1; k <= 14; k++) {
              if (turn) a += TURN * 0.07;
              o.x += Math.cos(a) * sp * 0.07;
              o.y += Math.sin(a) * sp * 0.07;
              wrap(o);
              if (hit(o.x, o.y, p.id, R() * 1.5)) return k;
            }
            return 15;
          };
          const fs = free(false), ft = free(true);
          let want;
          const horizon = U.lerp(5, 12, E.skill);
          if (fs < horizon || ft < horizon) want = ft > fs;
          else {
            const d = U.angDiff(s.a, Math.atan2(apple.y - s.y, apple.x - s.x));
            want = d > 0.25 && Math.random() < 0.4 + E.skill * 0.6;
          }
          if (Math.random() < U.lerp(0.08, 0.0, E.skill)) want = !want;
          E.hold(p.id, want);
        },
        draw(g) {
          const u = E.arena.u, r = R();
          const ar = E.arena;
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let x = ar.x; x < ar.x + ar.w; x += 8 * u) {
            g.beginPath();
            g.moveTo(x, ar.y);
            g.lineTo(x, ar.y + ar.h);
            g.stroke();
          }
          if (apple) E.emoji(g, '🍎', apple.x, apple.y, (7 + Math.sin(apple.t * 6) * 0.6) * u);
          for (const p of E.players) {
            const s = S[p.id], b = s.body, out = E.out[p.id];
            g.globalAlpha = out ? 0.3 : 1;
            g.lineCap = g.lineJoin = 'round';
            g.lineWidth = r * 2;
            g.strokeStyle = p.color.d;
            g.beginPath();
            // розриваємо лінію там, де змійка перейшла через край
            const jump = 10 * u;
            b.forEach((q, i) => (i && Math.abs(q.x - b[i - 1].x) + Math.abs(q.y - b[i - 1].y) < jump ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
            const lb = b[b.length - 1];
            if (Math.abs(s.x - lb.x) + Math.abs(s.y - lb.y) < jump) g.lineTo(s.x, s.y);
            g.stroke();
            g.lineWidth = r * 1.3;
            g.strokeStyle = p.color.c;
            g.stroke();
            g.globalAlpha = 1;
            E.avatar(g, s.x, s.y, r * 1.9, p, out ? 'out' : E.down[p.id] ? 'sly' : 'happy', s.a + Math.PI / 2);
            E.hud(g, p, String(s.eaten), { color: p.color.l, size: 4.5 * u });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
