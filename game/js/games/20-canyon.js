(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'canyon', name: 'Каньйон', icon: '🚀', tag: 'Виживання', bg: '#2A1A14', btn: 'ВПРАВО', lanes: true,
    desc: 'Ракета летить угору крізь каньйон. Тримайте кнопку — її зносить праворуч, відпустіть — ліворуч. Не торкайтеся стін і каменів. Останній, хто летить, перемагає.',
    create(E) {
      const RY = 0.78, ACC = 2.4, VMAX = 0.95, RR = 0.04;
      const r = U.rng((Math.random() * 1e9) | 0);
      const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
      const rocks = [];
      let s = 0, vs = 0.36;
      function hw(z) {
        return Math.max(0.15, 0.33 - z * 0.009);
      }
      function center(z) {
        const amp = Math.min(1.35, 1 + z * 0.02);
        const h = hw(z);
        const c = 0.5 + amp * (0.15 * Math.sin(z * 1.15 + p1) + 0.08 * Math.sin(z * 2.6 + p2) + 0.03 * Math.sin(z * 5.1 + p3));
        return U.clamp(c, h + 0.03, 1 - h - 0.03);
      }
      (function build() {
        let z = 6;
        while (z < 200) {
          const c = center(z), h = hw(z);
          const side = r() < 0.5 ? -1 : 1;
          rocks.push({ z, x: c + side * r.range(0.2, 0.55) * h, rad: r.range(0.035, 0.05) });
          z += r.range(1.1, 2.2);
        }
      })();
      const S = {};
      return {
        init() {
          for (const p of E.players) S[p.id] = { x: center(0), vx: 0, dead: false, deadT: 0, bj: 0 };
        },
        update(dt) {
          vs = 0.36 + Math.min(0.4, E.playT * 0.011);
          s += vs * dt;
          const z = s;
          const dead = [];
          for (const p of E.players) {
            const st = S[p.id];
            if (st.dead) continue;
            st.vx += (E.down[p.id] ? ACC : -ACC) * dt;
            st.vx = U.clamp(st.vx, -VMAX, VMAX);
            st.x += st.vx * dt;
            const c = center(z), h = hw(z);
            let hit = st.x - RR < c - h || st.x + RR > c + h;
            if (!hit) {
              for (const k of rocks) {
                if (k.z > z + 0.2) break;
                if (Math.abs(k.z - z) < 0.12 && Math.abs(k.x - st.x) < k.rad + RR * 0.8) {
                  // точніша перевірка у просторі панелі
                  const P = p.panel;
                  const dx = (k.x - st.x) * P.w, dz = (k.z - z) * P.h;
                  if (Math.hypot(dx, dz) < (k.rad + RR * 0.8) * P.w) hit = true;
                }
              }
            }
            if (hit) dead.push(p.id);
          }
          for (const id of dead) {
            S[id].dead = true;
            S[id].deadT = E.playT;
            const p = E.byId(id), P = p.panel;
            const x = P.x + (p.rot ? 1 - S[id].x : S[id].x) * P.w, y = P.y + (p.rot ? 1 - RY : RY) * P.h;
            E.burst(x, y, ['#FF9E4A', '#FFC530', p.color.c], 26);
            E.shake(4);
            E.eliminate(id);
          }
          if (dead.length) E.lastStanding(dead);
          if (E.playT > 100 && E.phase === 'play') E.finish(E.alive().map((p) => p.id));
        },
        bot(p, dt) {
          const st = S[p.id];
          if (st.dead) return;
          st.bj -= dt;
          if (st.bj > 0) return;
          st.bj = U.rand(0.02, 0.07) * (1.6 - E.skill);
          const la = U.lerp(0.22, 0.42, E.skill);
          const z = s + la;
          let tx = center(z);
          for (const k of rocks) {
            if (k.z < s - 0.1) continue;
            if (k.z > s + la + 0.3) break;
            if (Math.abs(k.x - tx) < k.rad + RR + 0.04) {
              const c = center(k.z);
              tx = k.x > c ? k.x - k.rad - RR - 0.06 : k.x + k.rad + RR + 0.06;
            }
          }
          tx += U.gauss() * U.lerp(0.05, 0.01, E.skill);
          const want = st.vx < (tx - st.x) * 3.2;
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        draw(g) {
          for (const p of E.players) {
            const st = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              g.fillStyle = '#5A2E1E';
              g.fillRect(0, 0, w, h);
              // русло каньйону
              const step = 6;
              const zAt = (y) => s + (RY * h - y) / h;
              g.fillStyle = '#1F1430';
              g.beginPath();
              for (let y = -step; y <= h + step; y += step) {
                const z = zAt(y);
                g.lineTo((center(z) - hw(z)) * w, y);
              }
              for (let y = h + step; y >= -step; y -= step) {
                const z = zAt(y);
                g.lineTo((center(z) + hw(z)) * w, y);
              }
              g.closePath();
              g.fill();
              // зорі в руслі
              g.fillStyle = 'rgba(255,255,255,0.25)';
              for (let i = 0; i < 14; i++) {
                const zz = Math.floor(s) + i * 0.37;
                const y = RY * h - (zz - s) * h;
                const x = (center(zz) + Math.sin(i * 7.1) * hw(zz) * 0.8) * w;
                g.fillRect(x, y, 2, 2);
              }
              // смуги на стінах
              g.strokeStyle = '#7A4028';
              g.lineWidth = 2;
              for (let i = 0; i < 8; i++) {
                const zz = Math.floor(s * 2) / 2 + i * 0.5 - 1;
                const y = RY * h - (zz - s) * h;
                g.beginPath();
                g.moveTo(0, y);
                g.lineTo((center(zz) - hw(zz)) * w - 4, y + 6);
                g.moveTo(w, y + 10);
                g.lineTo((center(zz) + hw(zz)) * w + 4, y + 4);
                g.stroke();
              }
              // каміння
              for (const k of rocks) {
                const y = RY * h - (k.z - s) * h;
                if (y < -40) break;
                if (y > h + 40) continue;
                g.fillStyle = '#8A5A3C';
                g.beginPath();
                g.arc(k.x * w, y, k.rad * w, 0, TAU);
                g.fill();
                g.fillStyle = '#A8754F';
                g.beginPath();
                g.arc(k.x * w - k.rad * w * 0.3, y - k.rad * w * 0.3, k.rad * w * 0.45, 0, TAU);
                g.fill();
              }
              // ракета
              const rx = st.x * w, ry = RY * h, rs = RR * w * 1.3;
              g.save();
              g.translate(rx, ry);
              g.rotate(st.vx * 0.5);
              if (!st.dead && E.phase === 'play') {
                g.fillStyle = '#FFC530';
                g.beginPath();
                g.moveTo(-rs * 0.45, rs * 0.9);
                g.lineTo(0, rs * (1.6 + Math.random() * 0.8));
                g.lineTo(rs * 0.45, rs * 0.9);
                g.fill();
                const side = E.down[p.id] ? -1 : 1;
                g.fillStyle = 'rgba(255,158,74,0.85)';
                g.beginPath();
                g.moveTo(side * rs * 0.6, -rs * 0.1);
                g.lineTo(side * rs * (1.3 + Math.random() * 0.4), 0);
                g.lineTo(side * rs * 0.6, rs * 0.3);
                g.fill();
              }
              g.fillStyle = st.dead ? '#6B6489' : p.color.c;
              g.beginPath();
              g.moveTo(0, -rs * 1.4);
              g.quadraticCurveTo(rs * 0.8, -rs * 0.4, rs * 0.6, rs * 0.9);
              g.lineTo(-rs * 0.6, rs * 0.9);
              g.quadraticCurveTo(-rs * 0.8, -rs * 0.4, 0, -rs * 1.4);
              g.fill();
              g.fillStyle = '#E6EEFF';
              g.beginPath();
              g.arc(0, -rs * 0.25, rs * 0.28, 0, TAU);
              g.fill();
              g.restore();
              E.txt(g, Math.floor(s * 50) + ' м', w - 8, 14, m * 0.055, 'rgba(255,255,255,0.7)', { align: 'right' });
              if (st.dead) E.outPanel(g, w, h, 'РОЗБИВСЯ');
            });
          }
        },
      };
    },
  });
})();
