(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'pool', name: 'Більярд', icon: '🎱', tag: 'Влучність', bg: '#0F3B2A', btn: 'УДАР', input: 'stick',
    verb: 'ЗАБИВАЙ!',
    desc: 'Відтягни джойстик і відпусти — удар. Забий більше куль.',
    create(E) {
      const TIME = 45;
      const S = {};
      let balls = [], pockets = [];
      // масштаб від площі столу: однаково грається і на широкому, і на вузькому екрані
      const K = () => {
        const t = table();
        return Math.sqrt(t.w * t.h) / 100;
      };
      const R = () => 2.9 * K();
      function table() {
        const ar = E.arena, m = 5 * ar.u;
        return { x: ar.x + m, y: ar.y + m, w: ar.w - 2 * m, h: ar.h - 2 * m };
      }
      return {
        init() {
          const ar = E.arena, u = ar.u, t = table();
          pockets = [
            [t.x, t.y], [t.x + t.w, t.y], [t.x, t.y + t.h], [t.x + t.w, t.y + t.h], [t.x, t.y + t.h / 2], [t.x + t.w, t.y + t.h / 2],
          ];
          const r = R();
          // піраміда з 6 куль у центрі
          let k = 0;
          for (let row = 0; row < 3; row++)
            for (let i = 0; i <= row; i++) {
              balls.push({ x: ar.cx + (i - row / 2) * r * 2.1, y: ar.cy - r * 2 + row * r * 1.85, vx: 0, vy: 0, owner: null, cue: false, last: null, num: ++k });
            }
          for (const p of E.players) {
            const h = E.home(p, 16 * u);
            const b = { x: h.x, y: h.y, vx: 0, vy: 0, owner: p.id, cue: true, last: null };
            balls.push(b);
            S[p.id] = { ball: b, sc: 0, aim: null, cd: 0, botT: U.rand(0.6, 1.5) };
          }
        },
        update(dt) {
          const t = table(), r = R(), u = E.arena.u;
          for (const p of E.players) {
            S[p.id].cd = Math.max(0, S[p.id].cd - dt);
            if (!p.bot && E.stick[p.id].on) S[p.id].aim = { x: E.stick[p.id].x, y: E.stick[p.id].y };
          }
          for (let it = 0; it < 3; it++) {
            const h = dt / 3;
            for (const b of balls) {
              if (b.gone) continue;
              const v = Math.hypot(b.vx, b.vy);
              if (v > 0) {
                const nv = Math.max(0, v - 22 * K() * h);
                b.vx *= nv / v;
                b.vy *= nv / v;
              }
              b.x += b.vx * h;
              b.y += b.vy * h;
              if (b.x < t.x + r) { b.x = t.x + r; b.vx = Math.abs(b.vx) * 0.85; }
              if (b.x > t.x + t.w - r) { b.x = t.x + t.w - r; b.vx = -Math.abs(b.vx) * 0.85; }
              if (b.y < t.y + r) { b.y = t.y + r; b.vy = Math.abs(b.vy) * 0.85; }
              if (b.y > t.y + t.h - r) { b.y = t.y + t.h - r; b.vy = -Math.abs(b.vy) * 0.85; }
              for (const [px, py] of pockets) {
                if (U.dist(b.x, b.y, px, py) < r * 2) {
                  if (b.cue) {
                    // своя біла в лузі: −1 і повертається додому
                    const p = E.byId(b.owner), s = S[p.id], hm = E.home(p, 16 * u);
                    s.sc = Math.max(0, s.sc - 1);
                    Object.assign(b, { x: hm.x, y: hm.y, vx: 0, vy: 0 });
                    E.float(hm.x, hm.y, '−1', '#FF5468', p.rot);
                  } else {
                    b.gone = true;
                    if (b.last != null) {
                      S[b.last].sc++;
                      G.sfx('coin');
                      E.hitstop(0.05);
                      E.float(px, py, '+1', G.COLORS[b.last].l);
                    }
                  }
                }
              }
            }
            for (let i = 0; i < balls.length; i++)
              for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i], b = balls[j];
                if (a.gone || b.gone) continue;
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                if (d < r * 2 && d > 0) {
                  const nx = dx / d, ny = dy / d, ov = r * 2 - d;
                  a.x -= (nx * ov) / 2;
                  a.y -= (ny * ov) / 2;
                  b.x += (nx * ov) / 2;
                  b.y += (ny * ov) / 2;
                  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                  if (rel > 0) {
                    a.vx -= rel * nx;
                    a.vy -= rel * ny;
                    b.vx += rel * nx;
                    b.vy += rel * ny;
                    // хто останній штовхнув кулю — тому й очко
                    const who = a.cue ? a.owner : a.last;
                    const who2 = b.cue ? b.owner : b.last;
                    if (!b.cue && who != null) b.last = who;
                    if (!a.cue && who2 != null) a.last = who2;
                  }
                }
              }
          }
          const left = balls.filter((b) => !b.cue && !b.gone).length;
          if (left === 0 || E.playT > TIME) {
            const v = {};
            E.players.forEach((p) => (v[p.id] = S[p.id].sc));
            // нічия на час — грають до наступної забитої кулі (ще до 20 с)
            if (left > 0 && E.best(v, 'max').length > 1 && E.playT < TIME + 20) return;
            E.finish(E.best(v, 'max'), 'Забито: ' + Math.max(...Object.values(v)));
          }
        },
        shoot(p, x, y) {
          const s = S[p.id], b = s.ball, u = E.arena.u;
          const l = Math.hypot(x, y);
          if (l < 0.2 || s.cd > 0) return;
          // удар у протилежний бік від відтягування
          b.vx = (-x / l) * l * 105 * K();
          b.vy = (-y / l) * l * 105 * K();
          s.cd = 0.8;
          G.sfx('hit');
        },
        bot(p, dt) {
          const s = S[p.id], b = s.ball;
          if (Math.hypot(b.vx, b.vy) > 2 || s.cd > 0) return E.setStick(p.id, 0, 0);
          s.botT -= dt;
          if (s.botT > 0) return;
          s.botT = U.rand(0.8, 2);
          let best = null, bd = Infinity;
          for (const o of balls) {
            if (o.cue || o.gone) continue;
            const d = U.dist(b.x, b.y, o.x, o.y);
            if (d < bd) { bd = d; best = o; }
          }
          if (!best) return;
          const a = Math.atan2(best.y - b.y, best.x - b.x) + U.gauss() * U.lerp(0.25, 0.06, E.skill);
          const pw = U.clamp(0.45 + bd / (120 * K()), 0.4, 1);
          this.shoot(p, -Math.cos(a) * pw, -Math.sin(a) * pw);
        },
        release(p) {
          // гравець відпускає джойстик — удар з останнього положення
          const s = S[p.id];
          if (s.aim) this.shoot(p, s.aim.x, s.aim.y);
          s.aim = null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u, t = table(), r = R();
          // запам'ятовуємо відтягування (до того, як джойстик обнулиться при відпусканні)
          for (const p of E.players) if (!p.bot && E.stick[p.id].on) S[p.id].aim = { x: E.stick[p.id].x, y: E.stick[p.id].y };
          g.fillStyle = '#5A3A22';
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          g.fillStyle = '#1F7A4D';
          g.fillRect(t.x, t.y, t.w, t.h);
          for (const [px, py] of pockets) {
            g.fillStyle = '#0B0B12';
            g.beginPath();
            g.arc(px, py, r * 1.9, 0, TAU);
            g.fill();
          }
          for (const b of balls) {
            if (b.gone) continue;
            if (b.cue) {
              const p = E.byId(b.owner);
              E.avatar(g, b.x, b.y, r * 1.15, p, 'sly');
              const s = S[p.id];
              if (s.aim && E.stick[p.id].on) {
                const l = Math.hypot(s.aim.x, s.aim.y);
                if (l > 0.2) {
                  g.strokeStyle = U.alpha(p.color.l, 0.7);
                  g.lineWidth = 0.6 * u;
                  g.setLineDash([1.5 * u, 1.5 * u]);
                  g.beginPath();
                  g.moveTo(b.x, b.y);
                  g.lineTo(b.x - (s.aim.x / l) * 30 * u, b.y - (s.aim.y / l) * 30 * u);
                  g.stroke();
                  g.setLineDash([]);
                }
              }
            } else {
              g.fillStyle = ['#FFC530', '#3AA8FF', '#FF5468', '#8B5CF6', '#FF9E4A', '#35D486'][b.num - 1];
              g.beginPath();
              g.arc(b.x, b.y, r, 0, TAU);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,0.4)';
              g.beginPath();
              g.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.3, 0, TAU);
              g.fill();
            }
          }
          for (const p of E.players) E.hud(g, p, String(S[p.id].sc), { color: p.color.l, size: 5 * u });
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / TIME);
        },
      };
    },
  });
})();
