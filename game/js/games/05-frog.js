(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'frog', name: "Жаб'ячий язик", icon: '🐸', tag: 'Влучність', bg: '#10261E', btn: 'ЯЗИК',
    desc: 'Приціл жаби гойдається сам. Тисніть, щоб вистрілити язиком і зловити муху. Золота муха — +3, оса — −2. Хто перший набере 10?',
    create(E) {
      const WIN = 10, TIME = 50;
      const F = {}, sc = {};
      let flies = [];
      function frogPos(p) {
        return E.home(p, (p.corner ? 11 : 7) * E.arena.u);
      }
      function spawnFly() {
        const ar = E.arena, u = ar.u;
        const r = Math.random();
        const type = r < 0.12 ? 'gold' : r < 0.32 ? 'wasp' : 'fly';
        const a = Math.random() * TAU;
        return {
          x: ar.cx + U.rand(-0.35, 0.35) * ar.w, y: ar.cy + U.rand(-0.3, 0.3) * ar.h,
          vx: Math.cos(a) * 10 * u, vy: Math.sin(a) * 10 * u,
          type, r: (type === 'wasp' ? 3.6 : 3) * u, caught: null, ph: Math.random() * TAU,
          max: (type === 'gold' ? 30 : type === 'wasp' ? 15 : 20) * u, born: 0,
        };
      }
      return {
        init() {
          const n = E.n + 5;
          flies = [];
          for (let i = 0; i < n; i++) flies.push(spawnFly());
          for (const p of E.players) {
            sc[p.id] = 0;
            const fp = frogPos(p);
            const fan = E.fan(p, 0.14);
            F[p.id] = {
              fan, ph: Math.random() * TAU, aim: fan.lo + fan.span / 2, len: 0, dir: 0, st: 'idle',
              lmax: U.dist(fp.x, fp.y, E.arena.cx, E.arena.cy) * 1.35, fly: null, cd: 0, think: 0,
            };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u;
          for (const p of E.players) {
            const f = F[p.id];
            f.aim = f.fan.lo + f.fan.span * (0.5 + 0.5 * Math.sin(E.playT * 1.8 + f.ph));
            f.cd = Math.max(0, f.cd - dt);
            if (f.st === 'out') {
              f.len += (f.lmax / 0.22) * dt;
              const fp = frogPos(p);
              const tx = fp.x + Math.cos(f.dir) * f.len, ty = fp.y + Math.sin(f.dir) * f.len;
              for (const fl of flies) {
                if (fl.caught != null) continue;
                if (U.dist(tx, ty, fl.x, fl.y) < fl.r + 1.8 * u) {
                  fl.caught = p.id;
                  f.fly = fl;
                  f.st = 'back';
                  G.sfx(fl.type === 'wasp' ? 'bad' : 'catch');
                  G.sfx('hit');
                  break;
                }
              }
              if (f.len >= f.lmax) f.st = 'back';
            } else if (f.st === 'back') {
              f.len -= (f.lmax / 0.26) * dt;
              if (f.len <= 0) {
                f.len = 0;
                f.st = 'idle';
                f.cd = 0.18;
                if (f.fly) {
                  const fl = f.fly;
                  const v = fl.type === 'gold' ? 3 : fl.type === 'wasp' ? -2 : 1;
                  sc[p.id] = Math.max(0, sc[p.id] + v);
                  const fp = frogPos(p);
                  E.float(fp.x, fp.y - 6 * u * (p.rot ? -1 : 1), (v > 0 ? '+' : '−') + Math.abs(v), v > 0 ? p.color.l : '#FF5468', p.rot);
                  G.sfx(v > 0 ? 'coin' : 'bad');
                  flies = flies.filter((x) => x !== fl);
                  E.after(0.6, () => flies.push(spawnFly()));
                  f.fly = null;
                  if (sc[p.id] >= WIN) return E.finish([p.id]);
                }
              }
            }
            if (f.fly) {
              const fp = frogPos(p);
              f.fly.x = fp.x + Math.cos(f.dir) * f.len;
              f.fly.y = fp.y + Math.sin(f.dir) * f.len;
            }
          }
          // політ мух
          const m = 7 * u;
          for (const fl of flies) {
            if (fl.caught != null) continue;
            fl.vx += U.rand(-1, 1) * 70 * u * dt;
            fl.vy += U.rand(-1, 1) * 70 * u * dt;
            const sp = Math.hypot(fl.vx, fl.vy);
            if (sp > fl.max) {
              fl.vx *= fl.max / sp;
              fl.vy *= fl.max / sp;
            }
            fl.x += fl.vx * dt;
            fl.y += fl.vy * dt;
            if (fl.x < ar.x + m) { fl.x = ar.x + m; fl.vx = Math.abs(fl.vx); }
            if (fl.x > ar.x + ar.w - m) { fl.x = ar.x + ar.w - m; fl.vx = -Math.abs(fl.vx); }
            if (fl.y < ar.y + m) { fl.y = ar.y + m; fl.vy = Math.abs(fl.vy); }
            if (fl.y > ar.y + ar.h - m) { fl.y = ar.y + ar.h - m; fl.vy = -Math.abs(fl.vy); }
          }
          if (E.playT >= TIME) E.finish(E.best(sc, 'max'));
        },
        bot(p, dt) {
          const f = F[p.id];
          if (f.st !== 'idle' || f.cd > 0) return;
          f.think -= dt;
          if (f.think > 0) return;
          f.think = U.rand(0.03, 0.12) * (1.4 - E.skill);
          const fp = frogPos(p);
          let best = null;
          for (const fl of flies) {
            if (fl.caught != null) continue;
            const d = U.dist(fp.x, fp.y, fl.x, fl.y);
            if (d > f.lmax * 0.95) continue;
            const t = d / (f.lmax / 0.22);
            const px = fl.x + fl.vx * t * E.skill, py = fl.y + fl.vy * t * E.skill;
            const a = Math.atan2(py - fp.y, px - fp.x);
            const tol = Math.atan((fl.r + 1.5 * E.arena.u) / d) * (0.6 + (1 - E.skill) * 0.9);
            if (Math.abs(U.angDiff(f.aim, a)) < tol) {
              if (!best || d < best.d) best = { d, fl };
            }
          }
          if (best && (best.fl.type !== 'wasp' || Math.random() < (1 - E.skill) * 0.3)) E.tap(p.id);
        },
        press(p) {
          const f = F[p.id];
          if (f.st !== 'idle' || f.cd > 0) return;
          f.st = 'out';
          f.dir = f.aim;
          f.len = 0;
          G.sfx('whoosh');
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // латаття
          g.fillStyle = '#163A2C';
          for (let i = 0; i < 7; i++) {
            const x = ar.x + ((i * 0.37 + 0.11) % 1) * ar.w, y = ar.y + ((i * 0.61 + 0.2) % 1) * ar.h;
            g.beginPath();
            g.arc(x, y, (8 + (i % 3) * 4) * u, 0.3, TAU - 0.3);
            g.lineTo(x, y);
            g.fill();
          }
          // мухи
          for (const fl of flies) {
            const wing = Math.sin(E.t * 40 + fl.ph) * 0.5 + 0.5;
            g.fillStyle = 'rgba(220,240,255,0.55)';
            g.beginPath();
            g.ellipse(fl.x - fl.r * 0.6, fl.y - fl.r * 0.5, fl.r * 0.7, fl.r * (0.3 + 0.3 * wing), -0.5, 0, TAU);
            g.ellipse(fl.x + fl.r * 0.6, fl.y - fl.r * 0.5, fl.r * 0.7, fl.r * (0.3 + 0.3 * wing), 0.5, 0, TAU);
            g.fill();
            g.beginPath();
            g.arc(fl.x, fl.y, fl.r * 0.75, 0, TAU);
            if (fl.type === 'gold') {
              g.fillStyle = '#FFC530';
              g.fill();
              g.strokeStyle = 'rgba(255,231,163,0.6)';
              g.lineWidth = u * 0.8;
              g.beginPath();
              g.arc(fl.x, fl.y, fl.r * 1.4 + Math.sin(E.t * 6) * u * 0.5, 0, TAU);
              g.stroke();
            } else if (fl.type === 'wasp') {
              g.fillStyle = '#FFC530';
              g.fill();
              g.fillStyle = '#1A1233';
              g.fillRect(fl.x - fl.r * 0.75, fl.y - fl.r * 0.18, fl.r * 1.5, fl.r * 0.36);
              g.beginPath();
              g.moveTo(fl.x - fl.r * 0.2, fl.y + fl.r * 0.7);
              g.lineTo(fl.x + fl.r * 0.2, fl.y + fl.r * 0.7);
              g.lineTo(fl.x, fl.y + fl.r * 1.2);
              g.fill();
            } else {
              g.fillStyle = '#2A2F3A';
              g.fill();
            }
          }
          // жаби
          for (const p of E.players) {
            const f = F[p.id], fp = frogPos(p);
            // приціл
            if (f.st === 'idle' && E.phase === 'play') {
              g.strokeStyle = U.alpha(p.color.l, 0.55);
              g.lineWidth = 0.7 * u;
              g.setLineDash([1.5 * u, 2 * u]);
              g.beginPath();
              g.moveTo(fp.x + Math.cos(f.aim) * 9 * u, fp.y + Math.sin(f.aim) * 9 * u);
              g.lineTo(fp.x + Math.cos(f.aim) * 26 * u, fp.y + Math.sin(f.aim) * 26 * u);
              g.stroke();
              g.setLineDash([]);
            }
            if (f.len > 0) {
              g.strokeStyle = '#FF7A9A';
              g.lineCap = 'round';
              g.lineWidth = 1.8 * u;
              g.beginPath();
              g.moveTo(fp.x, fp.y);
              g.lineTo(fp.x + Math.cos(f.dir) * f.len, fp.y + Math.sin(f.dir) * f.len);
              g.stroke();
              g.lineCap = 'butt';
              g.fillStyle = '#FF7A9A';
              g.beginPath();
              g.arc(fp.x + Math.cos(f.dir) * f.len, fp.y + Math.sin(f.dir) * f.len, 1.6 * u, 0, TAU);
              g.fill();
            }
            const a = f.st === 'idle' ? f.aim : f.dir;
            g.save();
            g.translate(fp.x, fp.y);
            g.rotate(a + Math.PI / 2);
            g.fillStyle = p.color.d;
            g.beginPath();
            g.ellipse(0, 1.5 * u, 9 * u, 7.5 * u, 0, 0, TAU);
            g.fill();
            g.fillStyle = p.color.c;
            g.beginPath();
            g.ellipse(0, 0, 8 * u, 6.5 * u, 0, 0, TAU);
            g.fill();
            for (const s of [-1, 1]) {
              g.fillStyle = p.color.c;
              g.beginPath();
              g.arc(s * 4.2 * u, -4.6 * u, 3 * u, 0, TAU);
              g.fill();
              g.fillStyle = '#fff';
              g.beginPath();
              g.arc(s * 4.2 * u, -4.8 * u, 2.2 * u, 0, TAU);
              g.fill();
              g.fillStyle = '#111';
              g.beginPath();
              g.arc(s * 4.2 * u, -5.5 * u, 1.1 * u, 0, TAU);
              g.fill();
            }
            g.restore();
            E.hud(g, p, `${sc[p.id]} / ${WIN}`, { color: p.color.l });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
