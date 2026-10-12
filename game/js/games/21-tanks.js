(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'tanks', name: 'Танчики', icon: '🪖', tag: 'Бій', bg: '#1C2416', btn: 'ВОГОНЬ',
    desc: 'Танк сам крутиться на місці. Коротке натискання — постріл, затисніть — їде вперед. Кулі відбиваються від стін. Три влучання — і ви вибули. Останній танк перемагає.',
    create(E) {
      const T = {};
      let bullets = [], blocks = [];
      const RAD = () => 4.6 * E.arena.u;
      function closest(x, y, b) {
        return [U.clamp(x, b.x, b.x + b.w), U.clamp(y, b.y, b.y + b.h)];
      }
      function collide(t) {
        const ar = E.arena, r = RAD();
        t.x = U.clamp(t.x, ar.x + r, ar.x + ar.w - r);
        t.y = U.clamp(t.y, ar.y + r, ar.y + ar.h - r);
        for (const b of blocks) {
          const [cx, cy] = closest(t.x, t.y, b);
          const d = Math.hypot(t.x - cx, t.y - cy);
          if (d < r && d > 0) {
            t.x += ((t.x - cx) / d) * (r - d);
            t.y += ((t.y - cy) / d) * (r - d);
          }
        }
      }
      function lineClear(x1, y1, x2, y2) {
        for (let k = 1; k < 12; k++) {
          const x = U.lerp(x1, x2, k / 12), y = U.lerp(y1, y2, k / 12);
          if (blocks.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h)) return false;
        }
        return true;
      }
      function fire(p) {
        const t = T[p.id], u = E.arena.u;
        if (t.cd > 0) return;
        t.cd = 0.5;
        bullets.push({ x: t.x + Math.cos(t.a) * RAD() * 1.5, y: t.y + Math.sin(t.a) * RAD() * 1.5, vx: Math.cos(t.a) * 62 * u, vy: Math.sin(t.a) * 62 * u, owner: p.id, t: 0, bounces: 0 });
        G.sfx('pop');
      }
      return {
        init() {
          const ar = E.arena;
          const bw = ar.w * 0.09, bh = ar.h * 0.15;
          blocks = [
            { x: ar.cx - ar.w * 0.27 - bw / 2, y: ar.cy - bh / 2, w: bw, h: bh },
            { x: ar.cx + ar.w * 0.27 - bw / 2, y: ar.cy - bh / 2, w: bw, h: bh },
            { x: ar.cx - ar.w * 0.1, y: ar.cy - ar.h * 0.25, w: ar.w * 0.2, h: ar.h * 0.03 },
            { x: ar.cx - ar.w * 0.1, y: ar.cy + ar.h * 0.22, w: ar.w * 0.2, h: ar.h * 0.03 },
          ];
          for (const p of E.players) {
            const h = E.home(p, (p.corner ? 11 : 9) * ar.u);
            T[p.id] = { x: h.x, y: h.y, a: Math.atan2(ar.cy - h.y, ar.cx - h.x), hp: 3, cd: 0, hold: 0, inv: 0, dir: p.seat % 2 ? -1 : 1, bt: 0, mv: 0 };
          }
        },
        update(dt) {
          const ar = E.arena, u = ar.u;
          for (const p of E.players) {
            const t = T[p.id];
            if (E.out[p.id]) continue;
            t.cd -= dt;
            t.inv -= dt;
            if (E.down[p.id]) {
              t.hold += dt;
              if (t.hold > 0.15) {
                t.x += Math.cos(t.a) * 24 * u * dt;
                t.y += Math.sin(t.a) * 24 * u * dt;
              }
            } else t.a += 2.3 * dt * t.dir;
            collide(t);
          }
          // танки не проїжджають один крізь одного
          const al = E.alive();
          for (let i = 0; i < al.length; i++)
            for (let j = i + 1; j < al.length; j++) {
              const a = T[al[i].id], b = T[al[j].id], d = U.dist(a.x, a.y, b.x, b.y), r = RAD() * 2;
              if (d < r && d > 0) {
                const k = (r - d) / d / 2;
                a.x -= (b.x - a.x) * k;
                a.y -= (b.y - a.y) * k;
                b.x += (b.x - a.x) * k;
                b.y += (b.y - a.y) * k;
              }
            }
          const hitNow = [];
          for (const b of bullets) {
            const px = b.x, py = b.y;
            b.t += dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < ar.x || b.x > ar.x + ar.w) { b.vx *= -1; b.x = U.clamp(b.x, ar.x, ar.x + ar.w); b.bounces++; }
            if (b.y < ar.y || b.y > ar.y + ar.h) { b.vy *= -1; b.y = U.clamp(b.y, ar.y, ar.y + ar.h); b.bounces++; }
            for (const k of blocks) {
              if (b.x > k.x && b.x < k.x + k.w && b.y > k.y && b.y < k.y + k.h) {
                if (px <= k.x || px >= k.x + k.w) b.vx *= -1;
                else b.vy *= -1;
                b.x = px;
                b.y = py;
                b.bounces++;
              }
            }
            for (const p of E.alive()) {
              const t = T[p.id];
              if (b.owner === p.id && b.t < 0.3) continue;
              if (U.dist(b.x, b.y, t.x, t.y) < RAD() + u) {
                b.dead = true;
                if (t.inv > 0) break;
                t.hp--;
                t.inv = 0.8;
                G.sfx('hit');
                E.shake(4);
                E.burst(t.x, t.y, [p.color.c, '#FFC530', '#fff'], 18);
                if (t.hp <= 0) {
                  E.eliminate(p.id);
                  hitNow.push(p.id);
                }
                break;
              }
            }
          }
          bullets = bullets.filter((b) => !b.dead && b.bounces <= 2 && b.t < 3);
          if (hitNow.length && E.lastStanding(hitNow)) return;
          if (E.playT > 80) {
            const hp = {};
            E.players.forEach((p) => (hp[p.id] = E.out[p.id] ? -1 : T[p.id].hp));
            E.finish(E.best(hp, 'max'));
          }
        },
        bot(p, dt) {
          const t = T[p.id], u = E.arena.u;
          if (E.down[p.id]) {
            t.mv -= dt;
            if (t.mv <= 0) E.hold(p.id, false);
            return;
          }
          t.bt -= dt;
          if (t.bt > 0) return;
          t.bt = U.rand(0.03, 0.09) * (1.5 - E.skill);
          let best = null, bd = Infinity;
          for (const q of E.alive()) {
            if (q.id === p.id) continue;
            const o = T[q.id], d = U.dist(t.x, t.y, o.x, o.y);
            if (d < bd) { bd = d; best = o; }
          }
          if (!best) return;
          const ta = Math.atan2(best.y - t.y, best.x - t.x);
          const diff = Math.abs(U.angDiff(t.a, ta));
          const tol = 0.06 + (1 - E.skill) * 0.14;
          const clear = lineClear(t.x, t.y, best.x, best.y);
          if (diff < tol && t.cd <= 0 && (clear || Math.random() < 0.1)) return E.tap(p.id);
          // ціль закрита стіною — їдемо до випадкової точки, щоб зайти збоку
          if (!t.roam || E.playT > t.roamT) {
            const ar = E.arena;
            t.roam = { x: ar.x + U.rand(0.12, 0.88) * ar.w, y: ar.y + U.rand(0.12, 0.88) * ar.h };
            t.roamT = E.playT + 3;
          }
          const goal = clear ? best : t.roam;
          const ga = Math.atan2(goal.y - t.y, goal.x - t.x);
          if ((bd > 42 * u || !clear) && Math.abs(U.angDiff(t.a, ga)) < 0.3 && Math.random() < 0.3) {
            E.hold(p.id, true);
            t.mv = U.rand(0.4, 0.9);
          }
        },
        press(p) {
          T[p.id].hold = 0;
        },
        release(p) {
          const t = T[p.id];
          if (t.hold < 0.18) fire(p);
          t.hold = 0;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          g.strokeStyle = 'rgba(255,255,255,0.04)';
          g.lineWidth = 1;
          for (let x = ar.x; x < ar.x + ar.w; x += 8 * u) { g.beginPath(); g.moveTo(x, ar.y); g.lineTo(x, ar.y + ar.h); g.stroke(); }
          for (let y = ar.y; y < ar.y + ar.h; y += 8 * u) { g.beginPath(); g.moveTo(ar.x, y); g.lineTo(ar.x + ar.w, y); g.stroke(); }
          for (const b of blocks) {
            g.fillStyle = '#6B5638';
            g.fillRect(b.x, b.y, b.w, b.h);
            g.strokeStyle = '#3E3120';
            g.lineWidth = 2;
            g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          }
          for (const b of bullets) {
            g.fillStyle = G.COLORS[b.owner].c;
            g.beginPath();
            g.arc(b.x, b.y, 1.4 * u, 0, TAU);
            g.fill();
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(b.x, b.y, 0.6 * u, 0, TAU);
            g.fill();
          }
          const r = RAD();
          for (const p of E.players) {
            const t = T[p.id];
            if (E.out[p.id]) {
              g.fillStyle = 'rgba(40,36,60,0.8)';
              g.beginPath();
              g.arc(t.x, t.y, r, 0, TAU);
              g.fill();
            } else if (!(t.inv > 0 && Math.floor(E.t * 14) % 2)) {
              g.save();
              g.translate(t.x, t.y);
              g.rotate(t.a);
              g.fillStyle = '#2B2A35';
              g.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 0.5);
              g.fillRect(-r * 1.05, r * 0.55, r * 2.1, r * 0.5);
              g.fillStyle = p.color.c;
              U.rr(g, -r * 0.9, -r * 0.75, r * 1.8, r * 1.5, r * 0.3);
              g.fill();
              g.fillStyle = p.color.d;
              g.fillRect(0, -r * 0.18, r * 1.5, r * 0.36);
              g.beginPath();
              g.arc(0, 0, r * 0.45, 0, TAU);
              g.fill();
              g.restore();
            }
            E.hud(g, p, E.out[p.id] ? 'ВИБУВ' : '♥'.repeat(t.hp) + '♡'.repeat(3 - t.hp), { color: p.color.l });
          }
        },
      };
    },
  });
})();
