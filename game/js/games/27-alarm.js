(function () {
  const { U } = G;
  G.game({
    id: 'alarm', name: 'П’ять фруктів', icon: '🔔', tag: 'Уважність', bg: '#173326', btn: 'ДЗВІН',
    verb: 'РІВНО П’ЯТЬ!', desc: 'Дзвони, коли фруктів одного виду рівно 5. Помилка — очко кожному суперникові.',
    create(E) {
      const WIN = 5;
      const FR = ['🍓', '🍌', '🍋', '🍇'];
      const sc = {}, lock = {}, botAt = {}, fumble = {};
      let piles = [], flipT = 1, speed = 1.2, pause = 0, okSince = -1, ring = 0, ringBy = null;
      function totals() {
        const t = [0, 0, 0, 0];
        for (const c of piles) if (c) t[c.f] += c.n;
        return t;
      }
      const isFive = () => totals().includes(5);
      function flip() {
        const i = U.randi(0, 3);
        // підбираємо карти так, щоб «п’ятірка» траплялася часто, але не завжди
        let c;
        const t = totals();
        if (Math.random() < 0.35) {
          const f = U.randi(0, 3), need = 5 - (t[f] - (piles[i] && piles[i].f === f ? piles[i].n : 0));
          c = need >= 1 && need <= 5 ? { f, n: need } : { f: U.randi(0, 3), n: U.randi(1, 4) };
        } else c = { f: U.randi(0, 3), n: U.randi(1, 4) };
        piles[i] = Object.assign(c, { t: 0 });
        G.sfx('tap', 1);
        const five = isFive();
        okSince = five ? E.playT : -1;
        E.players.forEach((p) => {
          botAt[p.id] = five ? E.playT + U.lerp(1.1, 0.48, E.skill) + U.rand(0, 0.35) * (1.2 - E.skill) : null;
          // хибна тривога: коли десь 4 або 6
          fumble[p.id] = !five && totals().some((v) => v === 4 || v === 6) && Math.random() < (1 - E.skill) * 0.12 ? E.playT + U.rand(0.4, 0.9) : null;
        });
      }
      function clearTable() {
        piles = [null, null, null, null];
        flipT = 0.9;
        pause = 0.7;
      }
      return {
        init() {
          E.players.forEach((p) => {
            sc[p.id] = 0;
            lock[p.id] = 0;
          });
          clearTable();
          pause = 0;
        },
        update(dt) {
          ring = Math.max(0, ring - dt * 3);
          for (const p of E.players) lock[p.id] = Math.max(0, lock[p.id] - dt);
          for (const c of piles) if (c) c.t += dt;
          if (pause > 0) {
            pause -= dt;
            return;
          }
          flipT -= dt;
          if (flipT <= 0) {
            flip();
            speed = Math.max(0.7, speed * 0.985);
            flipT = speed * U.rand(0.8, 1.2);
          }
          if (E.playT > 90) E.finish(E.best(sc, 'max'));
        },
        bot(p) {
          if (pause > 0 || lock[p.id] > 0) return;
          if (botAt[p.id] != null && E.playT >= botAt[p.id]) {
            botAt[p.id] = null;
            if (isFive()) E.tap(p.id);
          } else if (fumble[p.id] != null && E.playT >= fumble[p.id]) {
            fumble[p.id] = null;
            E.tap(p.id);
          }
        },
        press(p) {
          if (lock[p.id] > 0 || pause > 0) return;
          ring = 1;
          ringBy = p.id;
          const q = E.home(p, 14 * E.arena.u);
          if (isFive()) {
            sc[p.id]++;
            G.sfx('point');
            E.float(q.x, q.y, '+1', p.color.l, p.rot);
            E.burst(E.arena.cx, E.arena.cy, p.color.c, 24);
            if (sc[p.id] >= WIN) return E.finish([p.id]);
            clearTable();
          } else {
            lock[p.id] = 1.2;
            G.sfx('bad');
            E.shake(4);
            E.float(q.x, q.y, 'ПОМИЛКА!', '#FF5468', p.rot);
            for (const o of E.players) if (o.id !== p.id) sc[o.id]++;
            const w = E.players.find((o) => sc[o.id] >= WIN);
            if (w) E.finish(E.best(sc, 'max'));
          }
        },
        label(p) {
          return lock[p.id] > 0 ? 'ОЙ…' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // сукно
          g.fillStyle = '#1D3F2E';
          g.beginPath();
          g.ellipse(ar.cx, ar.cy, ar.w * 0.47, ar.h * 0.42, 0, 0, Math.PI * 2);
          g.fill();
          const cw = Math.min(ar.w * 0.36, 30 * u), ch = cw * 1.25;
          const off = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
          piles.forEach((c, i) => {
            const x = ar.cx + off[i][0] * (cw * 0.62), y = ar.cy + off[i][1] * (ch * 0.62);
            g.fillStyle = 'rgba(0,0,0,0.25)';
            U.rr(g, x - cw / 2 + 3, y - ch / 2 + 4, cw, ch, 3 * u);
            g.fill();
            if (!c) {
              g.strokeStyle = 'rgba(255,255,255,0.12)';
              g.setLineDash([1.5 * u, 1.5 * u]);
              U.rr(g, x - cw / 2, y - ch / 2, cw, ch, 3 * u);
              g.stroke();
              g.setLineDash([]);
              return;
            }
            const k = Math.min(1, c.t / 0.18);
            g.save();
            g.translate(x, y);
            g.scale(k, 1);
            g.fillStyle = '#FFF8EA';
            U.rr(g, -cw / 2, -ch / 2, cw, ch, 3 * u);
            g.fill();
            const pos = [[[0, 0]], [[-0.22, -0.22], [0.22, 0.22]], [[-0.22, -0.25], [0, 0], [0.22, 0.25]], [[-0.2, -0.22], [0.2, -0.22], [-0.2, 0.22], [0.2, 0.22]], [[-0.22, -0.26], [0.22, -0.26], [0, 0], [-0.22, 0.26], [0.22, 0.26]]][c.n - 1];
            for (const [px, py] of pos) E.emoji(g, FR[c.f], px * cw, py * ch, cw * 0.3);
            g.restore();
          });
          // дзвоник
          const bs = 9 * u * (1 + ring * 0.2);
          g.fillStyle = ring > 0 && ringBy != null ? G.COLORS[ringBy].c : '#FFC530';
          g.beginPath();
          g.arc(ar.cx, ar.cy, bs, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.beginPath();
          g.arc(ar.cx - bs * 0.3, ar.cy - bs * 0.3, bs * 0.35, 0, Math.PI * 2);
          g.fill();
          E.emoji(g, '🔔', ar.cx, ar.cy, bs * 1.2, ring * Math.sin(E.t * 40) * 0.4);
          for (const p of E.players) E.hud(g, p, `${sc[p.id]} / ${WIN}`, { color: p.color.l });
        },
      };
    },
  });
})();
