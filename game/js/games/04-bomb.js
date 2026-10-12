(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'bomb', name: 'Бомба', icon: '💣', tag: 'Нерви', bg: '#1B1424', btn: 'ПЕРЕДАЙ',
    desc: 'Бомба в того, на кого показує ґніт. Натисніть стільки разів, скільки крапок на бомбі, — і вона полетить далі. Вибухнула у вас — ви вибули.',
    create(E) {
      let holder = null, need = 0, fuse = 0, fuseT = 0, flyFrom = null, flyT = 0, beepT = 0, pause = 0, botNext = 0, boomT = 0;
      function pos(p) {
        return E.home(p, (p.corner ? 13 : 12) * E.arena.u);
      }
      function newRound() {
        const al = E.alive();
        holder = U.pick(al).id;
        need = U.randi(1, 3);
        fuse = U.rand(7, 13);
        fuseT = 0;
        flyFrom = null;
        botNext = U.rand(0.35, 0.6);
      }
      function pass() {
        const al = E.alive().filter((p) => p.id !== holder);
        if (!al.length) return;
        flyFrom = holder;
        holder = U.pick(al).id;
        flyT = 0;
        const left = 1 - fuseT / fuse;
        need = U.randi(1, left < 0.35 ? 5 : 4);
        botNext = U.rand(0.3, 0.55) * (1.3 - E.skill * 0.5);
        G.sfx('whoosh');
      }
      return {
        init() {
          newRound();
        },
        update(dt) {
          boomT = Math.max(0, boomT - dt);
          if (pause > 0) {
            pause -= dt;
            if (pause <= 0 && !E.lastStanding()) newRound();
            return;
          }
          fuseT += dt;
          if (flyFrom != null) {
            flyT += dt / 0.28;
            if (flyT >= 1) flyFrom = null;
          }
          const f = fuseT / fuse;
          beepT -= dt;
          if (beepT <= 0) {
            G.sfx('beep');
            beepT = U.lerp(0.75, 0.1, f * f);
          }
          if (fuseT >= fuse) {
            const p = E.byId(holder);
            const ps = pos(p);
            G.sfx('boom');
            E.shake(14);
            E.burst(ps.x, ps.y, ['#FF5468', '#FFC530', '#FF9E4A', '#fff'], 70, 1.4);
            boomT = 1;
            E.eliminate(holder);
            holder = null;
            pause = 1.4;
          }
        },
        bot(p, dt) {
          if (holder !== p.id || flyFrom != null || pause > 0) return;
          botNext -= dt;
          if (botNext <= 0) {
            E.tap(p.id);
            botNext = U.rand(0.13, 0.24) * U.lerp(1.4, 0.8, E.skill);
          }
        },
        press(p) {
          if (holder !== p.id || flyFrom != null || pause > 0) return;
          need--;
          G.sfx('tap', 3 - need);
          E.shake(1.5);
          if (need <= 0) pass();
        },
        label(p) {
          if (holder === p.id && flyFrom == null && pause <= 0) return `ТИСНИ ×${need}`;
          return '—';
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // підлога-мішень
          for (let i = 4; i >= 1; i--) {
            g.beginPath();
            g.arc(ar.cx, ar.cy, i * 11 * u, 0, TAU);
            g.fillStyle = i % 2 ? '#211932' : '#1B1424';
            g.fill();
          }
          for (const p of E.players) {
            const ps = pos(p);
            g.beginPath();
            g.arc(ps.x, ps.y, 8 * u, 0, TAU);
            g.fillStyle = E.out[p.id] ? '#2C2747' : p.color.c;
            g.fill();
            if (holder === p.id) {
              g.lineWidth = 1.2 * u;
              g.strokeStyle = '#fff';
              g.stroke();
            }
            E.txt(g, E.out[p.id] ? '✖' : '', ps.x, ps.y, 7 * u, '#8D86B0');
          }
          if (holder == null) {
            if (boomT > 0) {
              g.globalAlpha = boomT;
              g.fillStyle = '#FFE7A3';
              g.fillRect(ar.x, ar.y, ar.w, ar.h);
              g.globalAlpha = 1;
            }
            return;
          }
          // позиція бомби
          const hp = E.byId(holder);
          let bx = ar.cx, by = ar.cy;
          if (flyFrom != null) {
            const a = pos(E.byId(flyFrom)), b = pos(hp);
            const k = U.outCubic(Math.min(1, flyT));
            const mx = U.lerp(a.x, ar.cx, 0.7), my = U.lerp(a.y, ar.cy, 0.7);
            bx = U.lerp(U.lerp(a.x, mx, k), U.lerp(mx, ar.cx, k), k);
            by = U.lerp(U.lerp(a.y, my, k), U.lerp(my, ar.cy, k), k);
          }
          const toH = Math.atan2(pos(hp).y - by, pos(hp).x - bx);
          const f = fuseT / fuse;
          const R = 13 * u * (1 + 0.06 * Math.sin(E.t * U.lerp(6, 30, f)));
          // ґніт до власника
          g.strokeStyle = '#D9C49A';
          g.lineWidth = 1.4 * u;
          g.beginPath();
          g.moveTo(bx + Math.cos(toH) * R * 0.9, by + Math.sin(toH) * R * 0.9);
          g.quadraticCurveTo(
            bx + Math.cos(toH + 0.5) * R * 1.5, by + Math.sin(toH + 0.5) * R * 1.5,
            bx + Math.cos(toH) * R * 1.75, by + Math.sin(toH) * R * 1.75
          );
          g.stroke();
          const sx = bx + Math.cos(toH) * R * 1.75, sy = by + Math.sin(toH) * R * 1.75;
          for (let i = 0; i < 5; i++) {
            g.fillStyle = U.pick(['#FFC530', '#FF9E4A', '#fff']);
            g.beginPath();
            g.arc(sx + U.rand(-1.5, 1.5) * u, sy + U.rand(-1.5, 1.5) * u, U.rand(0.4, 1.1) * u, 0, TAU);
            g.fill();
          }
          // тіло бомби
          g.beginPath();
          g.arc(bx, by, R, 0, TAU);
          const red = Math.max(0, Math.sin(E.t * U.lerp(4, 22, f))) * f;
          g.fillStyle = `rgb(${Math.round(30 + 200 * red)},${Math.round(26 + 20 * red)},${Math.round(44 + 10 * red)})`;
          g.fill();
          g.lineWidth = 1.5 * u;
          g.strokeStyle = hp.color.c;
          g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.22)';
          g.beginPath();
          g.arc(bx - R * 0.35, by - R * 0.35, R * 0.28, 0, TAU);
          g.fill();
          // крапки = скільки натискань
          if (flyFrom == null) {
            for (let i = 0; i < need; i++) {
              const a = (i / need) * TAU + E.t * 0.6;
              const rr = need === 1 ? 0 : R * 0.45;
              g.beginPath();
              g.arc(bx + Math.cos(a) * rr, by + Math.sin(a) * rr, R * 0.15, 0, TAU);
              g.fillStyle = '#FFE7A3';
              g.fill();
            }
          }
          E.hud(g, hp, 'БОМБА В ТЕБЕ!', { color: hp.color.l, size: 3.4 * u });
        },
      };
    },
  });
})();
