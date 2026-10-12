(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'mouse', name: 'Мишка і кіт', icon: '🧀', tag: 'Обережність', bg: '#2A2018', btn: 'КРАДИСЬ',
    desc: 'Тримайте кнопку, щоб мишка кралася до сиру. Коли кіт ворушить вухами — відпускайте! Хто рухається, коли кіт дивиться, повертається на старт.',
    create(E) {
      const pr = {}, ret = {}, bt = {};
      const cat = { st: 'sleep', t: 0, dur: 2.5, grace: 0 };
      function startPos(p) {
        return E.home(p, (p.corner ? 9 : 7) * E.arena.u);
      }
      function endPos(p) {
        const u = E.arena.u;
        return { x: E.arena.cx - Math.cos(p.ang) * 17 * u, y: E.arena.cy - Math.sin(p.ang) * 17 * u };
      }
      function setCat(st, dur) {
        cat.st = st;
        cat.t = 0;
        cat.dur = dur;
        if (st === 'warn') {
          G.sfx('beep');
          cat.warnAt = E.playT;
        }
        if (st === 'awake') {
          cat.grace = 0.12;
          G.sfx('meow');
        }
      }
      return {
        init() {
          for (const p of E.players) {
            pr[p.id] = 0;
            ret[p.id] = false;
            bt[p.id] = { react: 0.3, resume: 0 };
          }
          setCat('sleep', U.rand(1.6, 3));
        },
        update(dt) {
          cat.t += dt;
          cat.grace = Math.max(0, cat.grace - dt);
          if (cat.t >= cat.dur) {
            if (cat.st === 'sleep') {
              setCat('warn', U.rand(0.55, 0.85));
              for (const p of E.players) {
                bt[p.id].react = U.rand(0.12, 0.55) * (1.3 - E.skill * 0.75);
                if (Math.random() < (1 - E.skill) * 0.35) bt[p.id].react = cat.dur + U.rand(0.05, 0.4);
              }
            } else if (cat.st === 'warn') {
              if (Math.random() < 0.8) setCat('awake', U.rand(1.3, 2.4));
              else setCat('sleep', U.rand(0.8, 2.2));
            } else if (cat.st === 'awake') setCat('sleep', U.rand(1.2, 3.6));
          }
          for (const p of E.players) {
            if (ret[p.id]) {
              pr[p.id] -= dt * 1.8;
              if (pr[p.id] <= 0) {
                pr[p.id] = 0;
                ret[p.id] = false;
              }
              continue;
            }
            if (!E.down[p.id]) continue;
            if (cat.st === 'awake' && cat.grace <= 0) {
              ret[p.id] = true;
              G.sfx('bad');
              E.shake(4);
              const m = E.byId(p.id), sp = startPos(m), ep = endPos(m);
              E.float(U.lerp(sp.x, ep.x, pr[p.id]), U.lerp(sp.y, ep.y, pr[p.id]), 'ПІЙМАВ!', '#FF5468', m.rot);
              continue;
            }
            pr[p.id] += dt / 5.6;
            if (pr[p.id] >= 1) return E.finish([p.id]);
          }
        },
        bot(p, dt) {
          const b = bt[p.id];
          let want = false;
          if (!ret[p.id]) {
            if (cat.st === 'sleep') {
              b.resume -= dt;
              want = b.resume <= 0;
            } else want = E.playT - cat.warnAt < b.react;
            if (cat.st !== 'sleep') b.resume = U.rand(0.05, 0.35);
          }
          if (want !== E.down[p.id]) E.hold(p.id, want);
        },
        label(p) {
          return ret[p.id] ? 'НАЗАД!' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // дерев'яна підлога
          for (let i = 0; i < 9; i++) {
            g.fillStyle = i % 2 ? '#2E231A' : '#2A2018';
            g.fillRect(ar.x, ar.y + (i * ar.h) / 9, ar.w, ar.h / 9);
          }
          if (cat.st === 'awake') {
            g.fillStyle = 'rgba(255,84,104,0.18)';
            g.fillRect(ar.x, ar.y, ar.w, ar.h);
          }
          // доріжки
          for (const p of E.players) {
            const s = startPos(p), e = endPos(p);
            g.strokeStyle = U.alpha(p.color.c, 0.35);
            g.lineWidth = 0.8 * u;
            g.setLineDash([1.5 * u, 2.5 * u]);
            g.beginPath();
            g.moveTo(s.x, s.y);
            g.lineTo(e.x, e.y);
            g.stroke();
            g.setLineDash([]);
          }
          // сир
          E.emoji(g, '🧀', ar.cx, ar.cy + 8 * u, 11 * u);
          // кіт (голова над сиром)
          const cx = ar.cx, cy = ar.cy - 2 * u, R = 9 * u;
          g.fillStyle = '#E0A458';
          g.beginPath();
          g.moveTo(cx - R * 0.95, cy - R * 0.2);
          g.lineTo(cx - R * 0.75, cy - R * (cat.st === 'sleep' ? 1.05 : 1.35));
          g.lineTo(cx - R * 0.2, cy - R * 0.85);
          g.moveTo(cx + R * 0.95, cy - R * 0.2);
          g.lineTo(cx + R * 0.75, cy - R * (cat.st === 'sleep' ? 1.05 : 1.35));
          g.lineTo(cx + R * 0.2, cy - R * 0.85);
          g.fill();
          g.beginPath();
          g.arc(cx, cy, R, 0, TAU);
          g.fill();
          g.strokeStyle = '#1A1233';
          g.lineWidth = 0.7 * u;
          for (const s of [-1, 1]) {
            const ex = cx + s * R * 0.4, ey = cy - R * 0.1;
            if (cat.st === 'sleep') {
              g.beginPath();
              g.arc(ex, ey, R * 0.18, 0.2, Math.PI - 0.2);
              g.stroke();
            } else {
              const open = cat.st === 'warn' ? 0.45 : 1;
              g.fillStyle = cat.st === 'awake' ? '#FFE15A' : '#F3E3B5';
              g.beginPath();
              g.ellipse(ex, ey, R * 0.22, R * 0.22 * open, 0, 0, TAU);
              g.fill();
              g.fillStyle = '#1A1233';
              g.beginPath();
              g.ellipse(ex, ey, R * 0.06, R * 0.18 * open, 0, 0, TAU);
              g.fill();
            }
          }
          g.fillStyle = '#FF7A9A';
          g.beginPath();
          g.moveTo(cx - R * 0.1, cy + R * 0.22);
          g.lineTo(cx + R * 0.1, cy + R * 0.22);
          g.lineTo(cx, cy + R * 0.34);
          g.fill();
          if (cat.st === 'sleep') {
            const k = (E.t * 0.8) % 1;
            g.globalAlpha = 1 - k;
            E.txt(g, 'z', cx + R * (1 + k * 0.6), cy - R * (0.8 + k * 1.2), (3 + k * 3) * u, '#C9C2EA');
            g.globalAlpha = 1;
          } else {
            const mark = cat.st === 'warn' ? '?' : '!';
            E.dual(g, (x, y) => E.txt(g, mark, x, y, 9 * u, cat.st === 'warn' ? '#FFC530' : '#FF5468', { stroke: '#1A1233' }), 19 * u, true);
          }
          // мишки
          for (const p of E.players) {
            const s = startPos(p), e = endPos(p);
            const x = U.lerp(s.x, e.x, pr[p.id]), y = U.lerp(s.y, e.y, pr[p.id]);
            const a = p.ang;
            const moving = E.down[p.id] && !ret[p.id] && E.phase === 'play';
            const bob = moving ? Math.sin(E.t * 22) * 0.5 * u : 0;
            g.save();
            g.translate(x, y + bob);
            g.rotate(a);
            g.strokeStyle = '#C9C2EA';
            g.lineWidth = 0.6 * u;
            g.beginPath();
            g.moveTo(-5 * u, 0);
            g.quadraticCurveTo(-9 * u, Math.sin(E.t * 6) * 3 * u, -12 * u, 0);
            g.stroke();
            g.fillStyle = ret[p.id] ? '#8D86B0' : p.color.c;
            g.beginPath();
            g.ellipse(0, 0, 5.5 * u, 3.8 * u, 0, 0, TAU);
            g.fill();
            g.beginPath();
            g.arc(2.5 * u, -3 * u, 1.8 * u, 0, TAU);
            g.arc(2.5 * u, 3 * u, 1.8 * u, 0, TAU);
            g.fill();
            g.fillStyle = '#1A1233';
            g.beginPath();
            g.arc(5.3 * u, 0, 0.8 * u, 0, TAU);
            g.fill();
            g.restore();
            E.hud(g, p, Math.round(pr[p.id] * 100) + '%', { color: p.color.l });
          }
        },
      };
    },
  });
})();
