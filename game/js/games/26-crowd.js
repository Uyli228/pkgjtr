(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'crowd', name: 'Хто з них ти?', icon: '🕵️', tag: 'Прихована роль', bg: '#1C2A22', btn: 'КРОК',
    desc: 'У натовпі однакових істот сховалися ваші. Тап — твоя істота робить крок (знайди, яка твоя!). Перший, хто дійде до фінішу, виграє. Затисни — приціл бігає по натовпу, відпусти — постріл. Влучив у гравця — він вибув; у невинного — ти себе видав.',
    create(E) {
      const STEP = 0.0125, FIN = 0.93, TOTAL = 18;
      let mobs = [];
      const P = {};
      let scanT = 0;
      function order() {
        return mobs.filter((m) => m.alive).sort((a, b) => b.x - a.x);
      }
      function stepMob(m) {
        m.x += STEP;
        m.hop = 1;
        m.steps.push(E.playT);
      }
      function suspicion(m) {
        m.steps = m.steps.filter((t) => E.playT - t < 4);
        return m.steps.length + m.x * 8;
      }
      return {
        init() {
          const ids = U.shuffle([...Array(TOTAL).keys()]);
          mobs = [];
          for (let i = 0; i < TOTAL; i++) mobs.push({ x: 0.07 + Math.random() * 0.03, row: i, owner: -1, alive: true, hop: 0, steps: [], next: U.rand(0.2, 1.2), reveal: 0 });
          E.players.forEach((p, k) => {
            mobs[ids[k]].owner = p.id;
            P[p.id] = { mob: mobs[ids[k]], shots: 2, cd: 0, aiming: false, pressT: 0, scan: 0, bt: U.rand(0.2, 0.5), target: null };
          });
        },
        update(dt) {
          scanT += dt;
          for (const m of mobs) {
            m.hop = Math.max(0, m.hop - dt * 6);
            m.reveal = Math.max(0, m.reveal - dt);
            if (m.owner >= 0 || !m.alive) continue;
            m.next -= dt;
            if (m.next <= 0) {
              if (m.x < FIN - 0.02) stepMob(m);
              // ритм як у людини: серії кроків і паузи
              m.next = Math.random() < 0.7 ? U.rand(0.15, 0.35) : U.rand(0.6, 1.8);
            }
          }
          for (const p of E.players) {
            const s = P[p.id];
            s.cd = Math.max(0, s.cd - dt);
            if (E.down[p.id] && !s.aiming && s.shots > 0 && s.cd <= 0 && E.playT - s.pressT > 0.25) {
              s.aiming = true;
              s.scan = 0;
              s.scanT = 0;
            }
            if (s.aiming) {
              s.scanT += dt;
              if (s.scanT > 0.32) {
                s.scanT = 0;
                s.scan++;
              }
            }
            if (!E.out[p.id] && s.mob.x >= FIN) return E.finish([p.id]);
          }
          if (E.playT > 75) {
            const d = {};
            E.alive().forEach((p) => (d[p.id] = P[p.id].mob.x));
            E.finish(E.best(d, 'max'));
          }
        },
        aimed(s) {
          const o = order();
          return o.length ? o[s.scan % o.length] : null;
        },
        bot(p, dt) {
          const s = P[p.id];
          if (s.aiming) {
            const m = this.aimed(s);
            if (m === s.target || E.playT - s.pressT > 3.5) E.hold(p.id, false);
            return;
          }
          if (E.down[p.id]) return;
          s.bt -= dt;
          if (s.bt > 0) return;
          // ходить «як натовп», лише трохи частіше
          s.bt = Math.random() < 0.72 ? U.rand(0.14, 0.32) : U.rand(0.5, 1.4);
          if (s.shots > 0 && s.cd <= 0 && Math.random() < 0.08 + E.skill * 0.1) {
            const cand = order().filter((m) => m !== s.mob);
            if (cand.length) {
              const top = cand.reduce((a, b) => (suspicion(b) > suspicion(a) ? b : a));
              const avg = cand.reduce((a, b) => a + suspicion(b), 0) / cand.length;
              if (suspicion(top) > avg + U.lerp(4, 2, E.skill) || top.x > 0.72) {
                s.target = top;
                E.hold(p.id, true);
                return;
              }
            }
          }
          E.tap(p.id);
        },
        press(p) {
          P[p.id].pressT = E.playT;
        },
        release(p) {
          const s = P[p.id];
          if (s.aiming) {
            s.aiming = false;
            const m = this.aimed(s);
            if (!m) return;
            s.shots--;
            m.alive = false;
            G.sfx('pop');
            E.shake(3);
            const ar = E.arena;
            const mx = ar.x + m.x * ar.w, my = ar.y + ((m.row + 0.5) / TOTAL) * ar.h;
            if (m.owner >= 0) {
              E.burst(mx, my, G.COLORS[m.owner].c, 30);
              E.eliminate(m.owner);
              E.lastStanding();
            } else {
              E.burst(mx, my, ['#B9B3D6', '#8D86B0'], 14);
              s.mob.reveal = 1.6;
              s.cd = 3;
              G.sfx('bad');
            }
            return;
          }
          if (!E.out[p.id] && s.mob.alive) stepMob(s.mob);
        },
        label(p) {
          const s = P[p.id];
          if (s.aiming) return 'ВІДПУСТИ — ПОСТРІЛ';
          return null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const rh = ar.h / TOTAL;
          for (let i = 0; i < TOTAL; i++) {
            g.fillStyle = i % 2 ? '#1F2F26' : '#1C2A22';
            g.fillRect(ar.x, ar.y + i * rh, ar.w, rh);
          }
          // фініш
          const fx = ar.x + FIN * ar.w;
          for (let i = 0; i < TOTAL * 2; i++) {
            g.fillStyle = i % 2 ? '#111' : '#eee';
            g.fillRect(fx, ar.y + (i * rh) / 2, 1.6 * u, rh / 2);
          }
          const r = Math.min(rh * 0.38, 3.6 * u);
          for (const m of mobs) {
            const x = ar.x + m.x * ar.w, y = ar.y + (m.row + 0.5) * rh - m.hop * r * 0.8;
            if (!m.alive) {
              g.fillStyle = m.owner >= 0 ? U.alpha(G.COLORS[m.owner].c, 0.7) : 'rgba(185,179,214,0.35)';
              g.beginPath();
              g.ellipse(x, y + r * 0.5, r * 1.4, r * 0.5, 0, 0, TAU);
              g.fill();
              continue;
            }
            const outed = m.reveal > 0 && Math.floor(E.t * 8) % 2;
            g.fillStyle = outed ? G.COLORS[m.owner].c : '#B9B3D6';
            g.beginPath();
            g.arc(x, y, r, 0, TAU);
            g.fill();
            g.fillStyle = '#1A1233';
            g.beginPath();
            g.arc(x + r * 0.35, y - r * 0.2, r * 0.18, 0, TAU);
            g.arc(x + r * 0.75, y - r * 0.2, r * 0.18, 0, TAU);
            g.fill();
          }
          // прицілювання
          for (const p of E.players) {
            const s = P[p.id];
            if (!s.aiming) continue;
            const m = this.aimed(s);
            if (!m) continue;
            const x = ar.x + m.x * ar.w, y = ar.y + (m.row + 0.5) * rh;
            g.strokeStyle = p.color.c;
            g.lineWidth = 0.6 * u;
            g.beginPath();
            g.arc(x, y, r * 1.9, 0, TAU);
            g.moveTo(x - r * 2.6, y);
            g.lineTo(x + r * 2.6, y);
            g.moveTo(x, y - r * 2.6);
            g.lineTo(x, y + r * 2.6);
            g.stroke();
          }
          for (const p of E.players) E.hud(g, p, E.out[p.id] ? 'ВИБУВ' : '🎯 ' + P[p.id].shots, { color: p.color.l, size: 3.8 * u });
        },
      };
    },
  });
})();
