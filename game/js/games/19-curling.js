(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'curling', name: 'Пінгвіни', icon: '🐧', tag: 'Відчуття', bg: '#14233A', btn: 'ТРИМАЙ',
    verb: 'НА ВІДЧУТТЯ!',
    desc: 'Тримай довше — сильніше. Пінгвін ближче до центру виграє.',
    create(E) {
      const ROUNDS = 2, MAXH = 1.3, WINDOW = 6;
      const S = {};
      let pens = [], round = 0, phase = 'aim', phaseT = 0;
      const MU = () => 30 * E.arena.u;
      const launch = (p) => E.home(p, (p.corner ? 10 : 8) * E.arena.u);
      function throwIt(p, pw) {
        const s = S[p.id];
        if (s.thrown) return;
        s.thrown = true;
        s.holding = false;
        const L = launch(p), ar = E.arena;
        const d = U.dist(L.x, L.y, ar.cx, ar.cy);
        const v0 = Math.sqrt(2 * MU() * d * (0.25 + 1.4 * pw));
        const a = Math.atan2(ar.cy - L.y, ar.cx - L.x) + U.rand(-0.04, 0.04);
        pens.push({ owner: p.id, x: L.x, y: L.y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0, gone: false, spin: 0 });
        G.sfx('whoosh');
      }
      function newRound() {
        round++;
        phase = 'aim';
        phaseT = 0;
        for (const p of E.players) {
          const s = S[p.id];
          s.thrown = false;
          s.holding = false;
          s.botStart = U.rand(0.3, 1.5);
          // боти теж кидають «на відчуття»
          s.botHold = U.clamp(0.536 * MAXH + U.gauss() * U.lerp(0.2, 0.06, E.skill), 0.1, MAXH);
        }
      }
      function closest() {
        let best = null, bd = Infinity;
        for (const k of pens) {
          if (k.gone) continue;
          const d = U.dist(k.x, k.y, E.arena.cx, E.arena.cy);
          if (d < bd) { bd = d; best = k; }
        }
        return best;
      }
      return {
        init() {
          for (const p of E.players) S[p.id] = { t0: 0 };
          newRound();
        },
        update(dt) {
          const ar = E.arena, u = ar.u, R = 4 * u;
          phaseT += dt;
          for (const p of E.players) {
            const s = S[p.id];
            if (s.holding && E.playT - s.t0 >= MAXH) throwIt(p, 1);
          }
          if (phase === 'aim' && phaseT > WINDOW) for (const p of E.players) if (!S[p.id].thrown) throwIt(p, 0.1);
          for (let it = 0; it < 3; it++) {
            const h = dt / 3;
            for (const k of pens) {
              if (k.gone) continue;
              const v = Math.hypot(k.vx, k.vy);
              if (v > 0) {
                const nv = Math.max(0, v - MU() * h);
                k.vx *= nv / v;
                k.vy *= nv / v;
                k.spin += v * h * 0.05;
              }
              k.x += k.vx * h;
              k.y += k.vy * h;
              if (k.x < ar.x - R || k.x > ar.x + ar.w + R || k.y < ar.y - R || k.y > ar.y + ar.h + R) k.gone = true;
            }
            for (let i = 0; i < pens.length; i++)
              for (let j = i + 1; j < pens.length; j++) {
                const a = pens[i], b = pens[j];
                if (a.gone || b.gone) continue;
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                if (d < R * 2 && d > 0) {
                  const nx = dx / d, ny = dy / d, ov = R * 2 - d;
                  a.x -= (nx * ov) / 2;
                  a.y -= (ny * ov) / 2;
                  b.x += (nx * ov) / 2;
                  b.y += (ny * ov) / 2;
                  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                  if (rel > 0) {
                    const jv = rel * 0.96;
                    a.vx -= jv * nx;
                    a.vy -= jv * ny;
                    b.vx += jv * nx;
                    b.vy += jv * ny;
                    if (rel > 8 * u) E.shake(Math.min(5, rel / (10 * u)));
                  }
                }
              }
          }
          const moving = pens.some((k) => !k.gone && Math.hypot(k.vx, k.vy) > 0.5);
          if (phase === 'aim' && E.players.every((p) => S[p.id].thrown)) {
            phase = 'roll';
            phaseT = 0;
          }
          if (phase === 'roll' && !moving && phaseT > 0.4) {
            if (round >= ROUNDS) {
              const c = closest();
              return E.finish(c ? [c.owner] : []);
            }
            newRound();
          }
        },
        bot(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown) return;
          if (!s.holding) {
            if (phaseT > s.botStart) E.press(p.id);
          } else if (E.playT - s.t0 >= s.botHold) E.release(p.id);
        },
        press(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown) return;
          s.holding = true;
          s.t0 = E.playT;
        },
        release(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown || !s.holding) return;
          throwIt(p, Math.min(1, (E.playT - s.t0) / MAXH));
        },
        label(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown) return 'ЧЕКАЙ';
          return s.holding ? 'ВІДПУСТИ' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#DCEBFA';
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          for (const [r, c] of [[26, '#3A7BD5'], [18, '#F4FAFF'], [10, '#E04050'], [3.5, '#F4FAFF']]) {
            g.beginPath();
            g.arc(ar.cx, ar.cy, r * u, 0, TAU);
            g.fillStyle = c;
            g.fill();
          }
          const best = closest();
          const peng = (x, y, col, rot, glow) => {
            g.save();
            g.translate(x, y);
            g.rotate(rot);
            if (glow) {
              g.strokeStyle = '#FFC530';
              g.lineWidth = 0.8 * u;
              g.beginPath();
              g.arc(0, 0, 5 * u, 0, TAU);
              g.stroke();
            }
            g.fillStyle = '#1A1A2A';
            g.beginPath();
            g.ellipse(0, 0, 4 * u, 3.3 * u, 0, 0, TAU);
            g.fill();
            g.fillStyle = '#fff';
            g.beginPath();
            g.ellipse(0.4 * u, 0, 2.6 * u, 2.2 * u, 0, 0, TAU);
            g.fill();
            g.fillStyle = col;
            g.fillRect(-1.6 * u, -3.3 * u, 1.3 * u, 6.6 * u);
            g.fillStyle = '#FF9E4A';
            g.beginPath();
            g.moveTo(3.6 * u, -0.6 * u);
            g.lineTo(5.2 * u, 0);
            g.lineTo(3.6 * u, 0.6 * u);
            g.fill();
            g.fillStyle = '#1A1A2A';
            g.beginPath();
            g.arc(2.6 * u, -1 * u, 0.45 * u, 0, TAU);
            g.arc(2.6 * u, 1 * u, 0.45 * u, 0, TAU);
            g.fill();
            g.restore();
          };
          for (const k of pens) if (!k.gone) peng(k.x, k.y, G.COLORS[k.owner].c, Math.atan2(k.vy, k.vx) || k.spin, k === best);
          for (const p of E.players) {
            const s = S[p.id], L = launch(p);
            if (phase === 'aim' && !s.thrown && E.phase === 'play') {
              const a = Math.atan2(ar.cy - L.y, ar.cx - L.x);
              // без шкали сили: пінгвін лише тремтить, поки тримаєш
              const shake = s.holding ? Math.sin(E.t * 40) * 0.6 * u : 0;
              peng(L.x + shake, L.y, p.color.c, a, false);
            }
            E.hud(g, p, '🐧 ' + Math.max(0, ROUNDS - round + (s.thrown ? 0 : 1)), { color: p.color.l, size: 3.8 * u });
          }
        },
      };
    },
  });
})();
