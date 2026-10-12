(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'curling', name: 'Керлінг-бум', icon: '🥌', tag: 'Сила кидка', bg: '#14233A', btn: 'ЗАТИСНИ',
    verb: 'ВІДПУСТИ ВЧАСНО', desc: 'Відпусти в зеленій зоні. Найближча до центру — виграє.',
    create(E) {
      const ROUNDS = 2, PERIOD = 1.5, WINDOW = 6;
      const S = {};
      let pucks = [], round = 0, phase = 'aim', phaseT = 0;
      const MU = () => 30 * E.arena.u;
      function launch(p) {
        return E.home(p, (p.corner ? 10 : 8) * E.arena.u);
      }
      function power(s) {
        const f = ((E.playT - s.t0) / PERIOD) % 1;
        return f < 0.5 ? f * 2 : 2 - f * 2;
      }
      function throwPuck(p, pw) {
        const s = S[p.id];
        if (s.thrown) return;
        s.thrown = true;
        s.holding = false;
        const L = launch(p), ar = E.arena;
        const d = U.dist(L.x, L.y, ar.cx, ar.cy);
        const D = d * (0.3 + 1.3 * pw);
        const v0 = Math.sqrt(2 * MU() * D);
        const a = Math.atan2(ar.cy - L.y, ar.cx - L.x);
        pucks.push({ owner: p.id, x: L.x, y: L.y, vx: Math.cos(a) * v0, vy: Math.sin(a) * v0, gone: 0 });
        s.last = pw;
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
          s.botStart = U.rand(0.3, 1.6);
          s.botTarget = U.clamp(0.538 + U.gauss() * U.lerp(0.13, 0.03, E.skill) + (round > 1 ? 0.03 : 0), 0.1, 0.95);
          s.prevPw = 0;
          if (E.down[p.id] && !p.bot) {
            s.holding = true;
            s.t0 = E.playT;
          }
        }
      }
      function closest() {
        const ar = E.arena;
        let best = null, bd = Infinity;
        for (const k of pucks) {
          if (k.gone) continue;
          const d = U.dist(k.x, k.y, ar.cx, ar.cy);
          if (d < bd) {
            bd = d;
            best = k;
          }
        }
        return best;
      }
      return {
        init() {
          for (const p of E.players) S[p.id] = { thrown: false, holding: false, t0: 0, last: 0 };
          newRound();
        },
        update(dt) {
          const ar = E.arena, u = ar.u, R = 4 * u;
          phaseT += dt;
          // авто-кидок, якщо гравець задрімав
          if (phase === 'aim' && phaseT > WINDOW) {
            for (const p of E.players) if (!S[p.id].thrown) throwPuck(p, S[p.id].holding ? power(S[p.id]) : 0.12);
          }
          // фізика
          const sub = 3;
          for (let it = 0; it < sub; it++) {
            const h = dt / sub;
            for (const k of pucks) {
              if (k.gone) continue;
              const v = Math.hypot(k.vx, k.vy);
              if (v > 0) {
                const nv = Math.max(0, v - MU() * h);
                k.vx *= nv / v;
                k.vy *= nv / v;
              }
              k.x += k.vx * h;
              k.y += k.vy * h;
              if (k.x < ar.x - R || k.x > ar.x + ar.w + R || k.y < ar.y - R || k.y > ar.y + ar.h + R) {
                k.gone = 1;
                G.sfx('bad');
              }
            }
            for (let i = 0; i < pucks.length; i++) {
              for (let j = i + 1; j < pucks.length; j++) {
                const a = pucks[i], b = pucks[j];
                if (a.gone || b.gone) continue;
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                if (d < R * 2 && d > 0) {
                  const nx = dx / d, ny = dy / d;
                  const ov = R * 2 - d;
                  a.x -= (nx * ov) / 2;
                  a.y -= (ny * ov) / 2;
                  b.x += (nx * ov) / 2;
                  b.y += (ny * ov) / 2;
                  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                  if (rel > 0) {
                    const e = 0.92;
                    const jv = (rel * (1 + e)) / 2;
                    a.vx -= jv * nx;
                    a.vy -= jv * ny;
                    b.vx += jv * nx;
                    b.vy += jv * ny;
                    if (rel > 8 * u) {
                      G.sfx('hit');
                      E.shake(Math.min(6, rel / (10 * u)));
                    }
                  }
                }
              }
            }
          }
          const moving = pucks.some((k) => !k.gone && Math.hypot(k.vx, k.vy) > 0.5);
          const allThrown = E.players.every((p) => S[p.id].thrown);
          if (phase === 'aim' && allThrown) {
            phase = 'roll';
            phaseT = 0;
          }
          if (phase === 'roll' && !moving && phaseT > 0.4) {
            if (round >= ROUNDS) {
              const c = closest();
              if (!c) return E.finish([], 'Усі шайби вилетіли');
              const d = U.dist(c.x, c.y, ar.cx, ar.cy) / u;
              return E.finish([c.owner], `До центру: ${Math.round(d * 2)} см`);
            }
            newRound();
          }
        },
        bot(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown) return;
          if (!s.holding) {
            if (phaseT > s.botStart) E.press(p.id);
            return;
          }
          const pw = power(s);
          if ((s.prevPw - s.botTarget) * (pw - s.botTarget) <= 0 && E.playT - s.t0 > 0.05) E.release(p.id);
          s.prevPw = pw;
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
          throwPuck(p, power(s));
        },
        label(p) {
          const s = S[p.id];
          if (phase !== 'aim' || s.thrown) return 'ЧЕКАЙ';
          return s.holding ? 'ВІДПУСТИ!' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.fillStyle = '#1C2E4A';
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          g.strokeStyle = 'rgba(255,255,255,0.04)';
          for (let i = 0; i < 20; i++) {
            g.beginPath();
            g.moveTo(ar.x + ((i * 0.37) % 1) * ar.w, ar.y);
            g.lineTo(ar.x + ((i * 0.71 + 0.2) % 1) * ar.w, ar.y + ar.h);
            g.stroke();
          }
          // будинок
          const rings = [[26, '#2F6FD6'], [18, '#E6EEFF'], [10, '#E04050'], [3.5, '#E6EEFF']];
          for (const [r, c] of rings) {
            g.beginPath();
            g.arc(ar.cx, ar.cy, r * u, 0, TAU);
            g.fillStyle = c;
            g.fill();
          }
          const c = closest();
          if (c) {
            g.strokeStyle = G.COLORS[c.owner].c;
            g.lineWidth = 0.6 * u;
            g.setLineDash([1.2 * u, 1.2 * u]);
            g.beginPath();
            g.moveTo(ar.cx, ar.cy);
            g.lineTo(c.x, c.y);
            g.stroke();
            g.setLineDash([]);
          }
          // шайби
          for (const k of pucks) {
            if (k.gone) continue;
            const col = G.COLORS[k.owner];
            g.fillStyle = 'rgba(0,0,0,0.3)';
            g.beginPath();
            g.arc(k.x + 0.6 * u, k.y + 0.8 * u, 4 * u, 0, TAU);
            g.fill();
            g.fillStyle = '#9AA3B8';
            g.beginPath();
            g.arc(k.x, k.y, 4 * u, 0, TAU);
            g.fill();
            g.fillStyle = col.c;
            g.beginPath();
            g.arc(k.x, k.y, 2.9 * u, 0, TAU);
            g.fill();
            g.fillStyle = col.d;
            g.fillRect(k.x - 1.8 * u, k.y - 0.6 * u, 3.6 * u, 1.2 * u);
          }
          // гравці: шкала сили
          for (const p of E.players) {
            const s = S[p.id], L = launch(p);
            const a = Math.atan2(ar.cy - L.y, ar.cx - L.x);
            if (phase === 'aim' && !s.thrown && E.phase === 'play') {
              const pw = s.holding ? power(s) : 0;
              const len = 26 * u;
              g.strokeStyle = 'rgba(255,255,255,0.15)';
              g.lineWidth = 2.6 * u;
              g.lineCap = 'round';
              g.beginPath();
              g.moveTo(L.x, L.y);
              g.lineTo(L.x + Math.cos(a) * len, L.y + Math.sin(a) * len);
              g.stroke();
              // ідеальна зона
              g.strokeStyle = 'rgba(53,212,134,0.45)';
              g.beginPath();
              g.moveTo(L.x + Math.cos(a) * len * 0.5, L.y + Math.sin(a) * len * 0.5);
              g.lineTo(L.x + Math.cos(a) * len * 0.58, L.y + Math.sin(a) * len * 0.58);
              g.stroke();
              if (pw > 0) {
                g.strokeStyle = pw > 0.75 ? '#FF5468' : p.color.c;
                g.lineWidth = 1.6 * u;
                g.beginPath();
                g.moveTo(L.x, L.y);
                g.lineTo(L.x + Math.cos(a) * len * pw, L.y + Math.sin(a) * len * pw);
                g.stroke();
              }
              g.lineCap = 'butt';
              g.fillStyle = p.color.c;
              g.beginPath();
              g.arc(L.x, L.y, 3 * u, 0, TAU);
              g.fill();
            }
            const left = ROUNDS - round + (S[p.id].thrown ? 0 : 1);
            E.hud(g, p, 'ШАЙБ: ' + Math.max(0, left), { color: p.color.l, size: 3.8 * u });
          }
        },
      };
    },
  });
})();
