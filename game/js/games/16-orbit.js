(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'orbit', name: 'Орбіта', icon: '🪐', tag: 'Виживання', bg: '#0B0A1E', btn: 'ПЕРЕСКОК',
    verb: 'ПЕРЕСКАКУЙ!', desc: 'Тап — на іншу орбіту. Не врізайся в уламки.',
    create(E) {
      const S = {};
      let hz = [], spawnT = 1.2, ang = 0, w = 1.1, bg = [];
      const r1 = 21, r2 = 35, SAT = 0.075; // радіуси в одиницях u, кутовий радіус супутника
      function satAng(p) {
        return ang + S[p.id].off;
      }
      function ringOf(s) {
        return s.tr > 0 ? (s.tr > 0.5 ? s.from : s.ring) : s.ring;
      }
      function overlapAny(ring, a, half, pad) {
        return hz.some((h) => h.ring === ring && Math.abs(U.angDiff(a, h.a)) < half + h.half + pad);
      }
      return {
        init() {
          for (let i = 0; i < 70; i++) bg.push({ x: Math.random(), y: Math.random(), s: Math.random() });
          E.players.forEach((p, i) => {
            S[p.id] = { off: (i / E.n) * TAU, ring: i % 2, from: i % 2, tr: 0, dead: false, bt: 0 };
          });
        },
        update(dt) {
          w = 1.2 + Math.min(1.6, E.playT * 0.05);
          ang += w * dt;
          // небезпеки
          spawnT -= dt;
          if (spawnT <= 0) {
            spawnT = Math.max(0.35, 1.1 - E.playT * 0.03);
            for (let tries = 0; tries < 8; tries++) {
              const ring = U.randi(0, 1);
              const a = Math.random() * TAU;
              const half = U.rand(0.18, 0.34 + Math.min(0.2, E.playT * 0.006));
              // не ставимо поруч із супутником, і лишаємо прохід на іншій орбіті
              if (E.players.some((p) => !S[p.id].dead && Math.abs(U.angDiff(satAng(p) + w * 0.9, a)) < half + 0.5)) continue;
              if (overlapAny(1 - ring, a, half, 0.35)) continue;
              if (overlapAny(ring, a, half, 0.05)) continue;
              hz.push({ ring, a, half, t: 0, warn: 1.0, life: U.rand(2.2, 4.2) });
              break;
            }
          }
          for (const h of hz) h.t += dt;
          hz = hz.filter((h) => h.t < h.warn + h.life + 0.3);
          const dead = [];
          for (const p of E.players) {
            const s = S[p.id];
            if (s.dead) continue;
            if (s.tr > 0) s.tr = Math.max(0, s.tr - dt / 0.16);
            const r = ringOf(s);
            const a = satAng(p);
            for (const h of hz) {
              if (h.ring !== r || h.t < h.warn || h.t > h.warn + h.life) continue;
              if (Math.abs(U.angDiff(a, h.a)) < h.half + SAT * (r === 0 ? 1.4 : 0.85)) {
                dead.push(p.id);
                break;
              }
            }
          }
          for (const id of dead) {
            S[id].dead = true;
            const p = E.byId(id), pos = this.pos(p);
            E.burst(pos.x, pos.y, [p.color.c, '#FFC530', '#fff'], 30);
            E.shake(5);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
          if (E.playT > 120 && E.phase === 'play') E.finish(E.alive().map((p) => p.id));
        },
        pos(p) {
          const s = S[p.id], u = E.arena.u;
          const ra = s.ring ? r2 : r1, rb = s.from ? r2 : r1;
          const r = U.lerp(ra, rb, s.tr) * u;
          const a = satAng(p);
          return { x: E.arena.cx + Math.cos(a) * r, y: E.arena.cy + Math.sin(a) * r };
        },
        bot(p, dt) {
          const s = S[p.id];
          if (s.dead || s.tr > 0) return;
          s.bt -= dt;
          if (s.bt > 0) return;
          s.bt = U.rand(0.04, 0.12) * (1.5 - E.skill);
          const a = satAng(p);
          const look = w * U.lerp(0.45, 0.75, E.skill);
          const danger = (ring, from, to) =>
            hz.some((h) => {
              if (h.ring !== ring || h.t > h.warn + h.life - 0.1) return false;
              const d = U.angDiff(a, h.a);
              return d + h.half > from && d - h.half < to;
            });
          if (danger(s.ring, -0.05, look) && !danger(1 - s.ring, -0.25, look * 0.8)) {
            if (Math.random() < 0.55 + E.skill * 0.45) E.tap(p.id);
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.dead || s.tr > 0) return;
          s.from = s.ring;
          s.ring = 1 - s.ring;
          s.tr = 1;
          G.sfx('jump');
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          for (const s of bg) {
            g.fillStyle = `rgba(255,255,255,${0.12 + s.s * 0.45})`;
            g.fillRect(ar.x + s.x * ar.w, ar.y + s.y * ar.h, 1 + s.s, 1 + s.s);
          }
          // орбіти
          g.strokeStyle = 'rgba(201,194,234,0.25)';
          g.lineWidth = 1;
          g.setLineDash([3, 5]);
          for (const r of [r1, r2]) {
            g.beginPath();
            g.arc(ar.cx, ar.cy, r * u, 0, TAU);
            g.stroke();
          }
          g.setLineDash([]);
          // планета
          const pr = 11 * u;
          const gr = g.createRadialGradient(ar.cx - pr * 0.4, ar.cy - pr * 0.4, pr * 0.1, ar.cx, ar.cy, pr);
          gr.addColorStop(0, '#9FE0C3');
          gr.addColorStop(1, '#2B7A6A');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(ar.cx, ar.cy, pr, 0, TAU);
          g.fill();
          g.strokeStyle = 'rgba(255,230,170,0.5)';
          g.lineWidth = 1.2 * u;
          g.beginPath();
          g.ellipse(ar.cx, ar.cy, pr * 1.5, pr * 0.4, -0.4, 0, TAU);
          g.stroke();
          // уламки
          for (const h of hz) {
            const r = (h.ring ? r2 : r1) * u;
            const warn = h.t < h.warn;
            const fade = h.t > h.warn + h.life ? 1 - (h.t - h.warn - h.life) / 0.3 : 1;
            if (warn && Math.floor(h.t * 10) % 2) continue;
            g.globalAlpha = warn ? 0.6 : fade;
            g.strokeStyle = warn ? '#FFC530' : '#FF6A3D';
            g.lineWidth = (warn ? 2 : 5) * u;
            g.lineCap = 'round';
            g.beginPath();
            g.arc(ar.cx, ar.cy, r, h.a - h.half, h.a + h.half);
            g.stroke();
            if (!warn) {
              g.strokeStyle = 'rgba(255,231,163,0.7)';
              g.lineWidth = 1.5 * u;
              g.stroke();
            }
            g.lineCap = 'butt';
            g.globalAlpha = 1;
          }
          // супутники
          for (const p of E.players) {
            if (S[p.id].dead) continue;
            const ps = this.pos(p);
            g.strokeStyle = U.alpha(p.color.c, 0.35);
            g.lineWidth = 2.2 * u;
            const r = Math.hypot(ps.x - ar.cx, ps.y - ar.cy);
            const a = satAng(p);
            g.beginPath();
            g.arc(ar.cx, ar.cy, r, a - 0.3, a);
            g.stroke();
            g.fillStyle = p.color.c;
            g.beginPath();
            g.arc(ps.x, ps.y, 2.8 * u, 0, TAU);
            g.fill();
            g.strokeStyle = '#fff';
            g.lineWidth = 0.6 * u;
            g.stroke();
          }
          for (const p of E.players) E.hud(g, p, S[p.id].dead ? 'ВИБУВ' : 'ЛЕТИТЬ', { color: S[p.id].dead ? '#8D86B0' : p.color.l, size: 3.8 * u });
        },
      };
    },
  });
})();
