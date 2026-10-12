(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'runner', name: 'Стрибунці', icon: '🦘', tag: 'Виживання', bg: '#1B1B33', btn: 'СТРИБОК', lanes: true,
    desc: 'Ваш стрибунець біжить сам. Тисніть, щоб перестрибнути перешкоду: коротке натискання — низький стрибок, довге — високий. Під високими птахами краще не стрибати! Останній, хто біжить, перемагає.',
    create(E) {
      const GROUND = 0.8, RX = 0.24, GRAV = 4.2, V0 = 1.5;
      const seed = (Math.random() * 1e9) | 0;
      const S = {};
      let dist = 0, speed = 0.55;
      // однакова траса для всіх
      const course = [];
      (function build() {
        const r = U.rng(seed);
        let x = 1.3;
        for (let i = 0; i < 400; i++) {
          const k = r();
          let o;
          if (i > 3 && k < 0.16) {
            o = { type: 'birdHi', w: 0.09, h: 0.07, y: 0.2 };
            x += 0.3;
          } else if (i > 2 && k < 0.3) o = { type: 'birdLo', w: 0.09, h: 0.07, y: 0.03 };
          else if (k < 0.55) o = { type: 'box', w: r.range(0.06, 0.1), h: r.range(0.07, 0.11), y: 0 };
          else if (k < 0.8) o = { type: 'spike', w: r.range(0.1, 0.16), h: 0.06, y: 0 };
          else o = { type: 'tall', w: 0.07, h: r.range(0.13, 0.17), y: 0 };
          o.x = x;
          course.push(o);
          x += r.range(0.58, 1.05) * (1 - Math.min(0.3, i * 0.005));
        }
      })();
      function hitbox() {
        return { rw: 0.035, rh: 0.075 };
      }
      return {
        init() {
          for (const p of E.players) S[p.id] = { y: 0, vy: 0, air: false, dead: false, deadAt: 0, next: 0, botJ: null, hold: 0 };
        },
        update(dt) {
          speed = 0.55 + E.playT * 0.013;
          dist += speed * dt;
          const hb = hitbox();
          const deadNow = [];
          for (const p of E.players) {
            const s = S[p.id];
            if (s.dead) continue;
            if (s.air) {
              s.vy -= GRAV * dt;
              if (!E.down[p.id] && s.vy > 0) s.vy -= GRAV * 1.6 * dt;
              s.y += s.vy * dt;
              if (s.y <= 0) {
                s.y = 0;
                s.vy = 0;
                s.air = false;
              }
            }
            // зіткнення
            for (const o of course) {
              const ox = o.x - dist + RX;
              if (ox > RX + 0.3) break;
              if (ox + o.w < RX - 0.1) continue;
              const ix = Math.abs(RX - (ox + o.w / 2)) < hb.rw * 0.8 + o.w / 2;
              const ry0 = s.y, ry1 = s.y + hb.rh;
              const iy = ry1 > o.y + 0.01 && ry0 < o.y + o.h - 0.008;
              if (ix && iy) {
                deadNow.push(p.id);
                break;
              }
            }
          }
          for (const id of deadNow) {
            S[id].dead = true;
            S[id].deadAt = E.playT;
            const p = E.byId(id);
            E.burst(p.panel.x + p.panel.w * (p.rot ? 1 - RX : RX), p.panel.y + p.panel.h * (p.rot ? 1 - GROUND : GROUND), p.color.c, 20);
            E.eliminate(id);
          }
          if (deadNow.length) E.lastStanding(deadNow);
          if (E.playT > 90 && E.phase === 'play') E.finish(E.alive().map((p) => p.id));
        },
        bot(p, dt) {
          const s = S[p.id];
          if (s.dead) return;
          if (s.air) {
            if (s.botRel != null) {
              s.botRel -= dt;
              if (s.botRel <= 0) {
                s.botRel = null;
                E.hold(p.id, false);
              }
            }
            return;
          }
          if (E.down[p.id]) E.hold(p.id, false);
          for (const o of course) {
            const ox = o.x - dist + RX;
            if (ox + o.w < RX - 0.05) continue;
            if (o.botPlan == null) o.botPlan = {};
            if (o.botPlan[p.id] == null) {
              const apex = o.type === 'tall' || o.type === 'spike' ? 0.3 : 0.22;
              o.botPlan[p.id] = Math.max(0.1, apex - (o.w / 2 + 0.02) / speed) + U.gauss() * U.lerp(0.06, 0.012, E.skill);
            }
            const ttr = (ox - RX - 0.035) / speed;
            if (o.type === 'birdHi') {
              if (ttr < 0.5) return;
              continue;
            }
            if (ttr < o.botPlan[p.id]) {
              E.hold(p.id, true);
              s.botRel = o.type === 'tall' || o.type === 'spike' ? 0.3 : o.type === 'birdLo' ? 0.25 : 0.14;
            }
            return;
          }
        },
        press(p) {
          const s = S[p.id];
          if (s.dead || s.air) return;
          s.air = true;
          s.vy = V0;
          G.sfx('jump');
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const gy = GROUND * h;
              const gr = g.createLinearGradient(0, 0, 0, gy);
              gr.addColorStop(0, '#1B1B33');
              gr.addColorStop(1, '#2C2350');
              g.fillStyle = gr;
              g.fillRect(0, 0, w, gy);
              // пагорби
              g.fillStyle = '#251F45';
              for (let i = -1; i < 4; i++) {
                const x = (i - ((dist * 0.3) % 1)) * w * 0.6;
                g.beginPath();
                g.arc(x, gy, w * 0.22, Math.PI, 0);
                g.fill();
              }
              g.fillStyle = '#3B2F6B';
              g.fillRect(0, gy, w, h - gy);
              g.fillStyle = '#4C3E86';
              for (let i = 0; i < 12; i++) {
                const x = ((i * 0.13 - dist) % 1.3 + 1.3) % 1.3;
                g.fillRect(x * w, gy + 6, w * 0.04, 3);
              }
              // перешкоди
              for (const o of course) {
                const ox = o.x - dist + RX;
                if (ox > 1.05) break;
                if (ox + o.w < -0.05) continue;
                const x = ox * w, ow = o.w * w, oy = gy - (o.y + o.h) * h, oh = o.h * h;
                if (o.type === 'spike') {
                  g.fillStyle = '#FF5468';
                  const n = Math.max(2, Math.round(o.w / 0.035));
                  g.beginPath();
                  for (let i = 0; i < n; i++) {
                    g.moveTo(x + (i * ow) / n, gy);
                    g.lineTo(x + ((i + 0.5) * ow) / n, oy);
                    g.lineTo(x + ((i + 1) * ow) / n, gy);
                  }
                  g.fill();
                } else if (o.type === 'birdHi' || o.type === 'birdLo') {
                  const flap = Math.sin(E.t * 14 + o.x * 10) * oh * 0.6;
                  g.fillStyle = o.type === 'birdHi' ? '#3AA8FF' : '#FF9E4A';
                  g.beginPath();
                  g.ellipse(x + ow / 2, oy + oh / 2, ow / 2, oh / 2.6, 0, 0, TAU);
                  g.fill();
                  g.beginPath();
                  g.moveTo(x + ow * 0.3, oy + oh / 2);
                  g.lineTo(x + ow * 0.5, oy + oh / 2 - flap);
                  g.lineTo(x + ow * 0.7, oy + oh / 2);
                  g.fill();
                  g.fillStyle = '#FFC530';
                  g.beginPath();
                  g.moveTo(x, oy + oh * 0.45);
                  g.lineTo(x - ow * 0.18, oy + oh * 0.55);
                  g.lineTo(x, oy + oh * 0.65);
                  g.fill();
                } else {
                  g.fillStyle = o.type === 'tall' ? '#8D86B0' : '#B98A4A';
                  g.fillRect(x, oy, ow, oh);
                  g.strokeStyle = 'rgba(0,0,0,0.25)';
                  g.lineWidth = 2;
                  g.strokeRect(x + 1, oy + 1, ow - 2, oh - 2);
                }
              }
              // стрибунець
              const rw = 0.035 * w, rh = 0.075 * h;
              const rx = RX * w, ry = gy - s.y * h;
              const sq = s.air ? 1 : 1 + Math.abs(Math.sin(E.t * 14)) * 0.08;
              g.save();
              g.translate(rx, ry);
              if (s.dead) g.rotate(Math.min(1.6, (E.playT - s.deadAt) * 6));
              g.fillStyle = s.dead ? '#6B6489' : p.color.c;
              U.rr(g, -rw, -rh * sq, rw * 2, rh * sq, rw * 0.7);
              g.fill();
              g.fillStyle = '#fff';
              g.beginPath();
              g.arc(rw * 0.35, -rh * sq * 0.7, rw * 0.35, 0, TAU);
              g.fill();
              g.fillStyle = '#1A1233';
              g.beginPath();
              g.arc(rw * 0.5, -rh * sq * 0.7, rw * 0.17, 0, TAU);
              g.fill();
              g.restore();
              E.txt(g, Math.floor(dist * 10) + ' м', w - 8, 14, Math.min(w, h) * 0.055, 'rgba(255,255,255,0.6)', { align: 'right' });
              if (s.dead) E.outPanel(g, w, h, 'ВРІЗАВСЯ');
            });
          }
        },
      };
    },
  });
})();
