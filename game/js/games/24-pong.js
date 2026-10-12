(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'pong', name: 'Пінг-понг на всіх', icon: '🏓', tag: 'Реакція', bg: '#101830', btn: 'ТРИМАЙ',
    desc: 'Кожен захищає свій кольоровий край ракеткою. Тримайте кнопку — ракетка їде від вашого кута, відпустіть — до кута. Пропустили м’яч — мінус життя. Останній із життями перемагає.',
    create(E) {
      const LIVES = 3;
      // ракетки поступово меншають, щоб гра не тягнулась вічно
      const half = () => Math.max(0.07, 0.14 - Math.max(0, E.playT - 25) * 0.0025);
      const P = {};
      let balls = [], pauseT = 0;
      // сторона поля для кожного гравця
      function sideOf(p) {
        if (!p.corner) return p.seat === 0 ? 'bottom' : 'top';
        return ['left', 'right', 'top', 'bottom'][p.seat];
      }
      function geom(side) {
        const ar = E.arena, m = 3 * ar.u;
        if (side === 'bottom') return { x0: ar.x, y0: ar.y + ar.h - m, x1: ar.x + ar.w, y1: ar.y + ar.h - m, horiz: true, nx: 0, ny: -1 };
        if (side === 'top') return { x0: ar.x, y0: ar.y + m, x1: ar.x + ar.w, y1: ar.y + m, horiz: true, nx: 0, ny: 1 };
        if (side === 'left') return { x0: ar.x + m, y0: ar.y, x1: ar.x + m, y1: ar.y + ar.h, horiz: false, nx: 1, ny: 0 };
        return { x0: ar.x + ar.w - m, y0: ar.y, x1: ar.x + ar.w - m, y1: ar.y + ar.h, horiz: false, nx: -1, ny: 0 };
      }
      const owners = () => E.players.filter((p) => !E.out[p.id]).map((p) => P[p.id].side);
      function serve() {
        const ar = E.arena, u = ar.u;
        const al = E.alive();
        const tgt = U.pick(al);
        const gm = geom(P[tgt.id].side);
        const a = Math.atan2(-gm.ny, -gm.nx) + U.rand(-0.5, 0.5);
        balls.push({ x: ar.cx, y: ar.cy, vx: Math.cos(a) * 48 * u, vy: Math.sin(a) * 48 * u, sp: 48 * u });
      }
      return {
        init() {
          for (const p of E.players) {
            const side = sideOf(p);
            const gm = geom(side);
            let sign;
            if (!p.corner) sign = p.rot ? -1 : 1;
            else if (gm.horiz) sign = p.ax < E.arena.cx ? 1 : -1;
            else sign = p.ay > E.arena.cy ? -1 : 1;
            P[p.id] = { side, pos: 0.5, sign, lives: LIVES, bt: 0, target: 0.5 };
          }
          serve();
        },
        update(dt) {
          const ar = E.arena, u = ar.u, br = 1.8 * u;
          for (const p of E.alive()) {
            const s = P[p.id];
            s.pos = U.clamp(s.pos + (E.down[p.id] ? 1 : -1) * s.sign * 0.85 * dt, half(), 1 - half());
          }
          // з часом м'ячів більшає; пропущений м'яч повертається в центр за мить
          const want = E.playT > 40 ? 3 : E.playT > 15 ? 2 : 1;
          pauseT -= dt;
          if (balls.length < want && pauseT <= 0) {
            serve();
            pauseT = 0.9;
          }
          const live = owners();
          const lost = [];
          for (const b of balls) {
            // на двох гравців не даємо м'ячу годинами літати між боковими стінками
            if (!E.players[0].corner && Math.abs(b.vy) < b.sp * 0.4) {
              b.vy = Math.sign(b.vy || 1) * b.sp * 0.4;
              b.vx = Math.sign(b.vx || 1) * Math.sqrt(b.sp * b.sp - b.vy * b.vy);
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            for (const side of ['bottom', 'top', 'left', 'right']) {
              const gm = geom(side);
              const along = gm.horiz ? (b.x - ar.x) / ar.w : (b.y - ar.y) / ar.h;
              const dist = gm.horiz ? (b.y - gm.y0) * gm.ny : (b.x - gm.x0) * gm.nx;
              const moving = b.vx * gm.nx + b.vy * gm.ny < 0;
              if (dist > br || !moving) continue;
              const owner = E.players.find((p) => !E.out[p.id] && P[p.id].side === side);
              if (!live.includes(side) || !owner) {
                // стіна
                if (dist < 0) {
                  if (gm.horiz) b.vy *= -1;
                  else b.vx *= -1;
                }
                continue;
              }
              const s = P[owner.id];
              const off = (along - s.pos) / half();
              if (Math.abs(off) <= 1.1 && dist > -br * 2) {
                b.sp = Math.min(140 * u, b.sp * 1.08);
                const base = Math.atan2(gm.ny, gm.nx);
                const a = base + U.clamp(off, -1, 1) * 0.9;
                b.vx = Math.cos(a) * b.sp;
                b.vy = Math.sin(a) * b.sp;
                G.sfx('tap', 4);
              } else if (dist < -br * 2) {
                b.dead = true;
                lost.push(owner.id);
              }
            }
          }
          balls = balls.filter((b) => !b.dead);
          for (const id of lost) {
            const s = P[id];
            s.lives--;
            G.sfx('bad');
            E.shake(4);
            const p = E.byId(id);
            E.burst(p.ax, p.ay, p.color.c, 16);
            if (s.lives <= 0) E.eliminate(id);
          }
          if (lost.length) {
            if (E.lastStanding(lost)) return;
            pauseT = Math.max(pauseT, 0.8);
          }
        },
        bot(p, dt) {
          const s = P[p.id], ar = E.arena;
          s.bt -= dt;
          if (s.bt <= 0) {
            s.bt = U.rand(0.1, 0.25) * (1.5 - E.skill);
            const gm = geom(s.side);
            let best = null, bt = Infinity;
            for (const b of balls) {
              const vn = b.vx * gm.nx + b.vy * gm.ny;
              if (vn >= 0) continue;
              const dist = gm.horiz ? (b.y - gm.y0) * gm.ny : (b.x - gm.x0) * gm.nx;
              const t = dist / -vn;
              if (t < bt) { bt = t; best = b; }
            }
            if (best) {
              let a = gm.horiz ? (best.x + best.vx * bt - ar.x) / ar.w : (best.y + best.vy * bt - ar.y) / ar.h;
              a = Math.abs(a) % 2;
              if (a > 1) a = 2 - a;
              s.target = a + U.gauss() * U.lerp(0.2, 0.06, E.skill) * (1 + bt * 0.3);
            } else s.target = 0.5;
          }
          const d = s.target - s.pos;
          const want = Math.abs(d) < 0.02 ? Math.random() < 0.5 : Math.sign(d) === s.sign;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.strokeStyle = 'rgba(255,255,255,0.08)';
          g.setLineDash([2 * u, 2 * u]);
          g.beginPath();
          g.arc(ar.cx, ar.cy, 14 * u, 0, TAU);
          g.stroke();
          g.setLineDash([]);
          for (const side of ['bottom', 'top', 'left', 'right']) {
            const gm = geom(side);
            const owner = E.players.find((p) => P[p.id].side === side);
            const alive = owner && !E.out[owner.id];
            g.strokeStyle = alive ? U.alpha(owner.color.c, 0.35) : 'rgba(201,194,234,0.5)';
            g.lineWidth = alive ? 1 : 1.4 * u;
            g.setLineDash(alive ? [1.5 * u, 1.5 * u] : []);
            g.beginPath();
            g.moveTo(gm.x0, gm.y0);
            g.lineTo(gm.x1, gm.y1);
            g.stroke();
            g.setLineDash([]);
            if (!alive) continue;
            const s = P[owner.id];
            const len = (gm.horiz ? ar.w : ar.h) * half() * 2;
            const cx = gm.horiz ? ar.x + s.pos * ar.w : gm.x0, cy = gm.horiz ? gm.y0 : ar.y + s.pos * ar.h;
            g.fillStyle = owner.color.c;
            if (gm.horiz) U.rr(g, cx - len / 2, cy - 1.2 * u, len, 2.4 * u, 1.2 * u);
            else U.rr(g, cx - 1.2 * u, cy - len / 2, 2.4 * u, len, 1.2 * u);
            g.fill();
          }
          for (const b of balls) {
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(b.x, b.y, 1.8 * u, 0, TAU);
            g.fill();
          }
          for (const p of E.players) E.hud(g, p, E.out[p.id] ? 'ВИБУВ' : '♥'.repeat(P[p.id].lives) + '♡'.repeat(LIVES - P[p.id].lives), { color: p.color.l, off: 6 * u });
        },
      };
    },
  });
})();
