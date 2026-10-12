(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'tower', name: 'Спільна вежа', icon: '🏗️', tag: 'Саботаж', bg: '#141029', btn: 'КЛАЦ',
    verb: 'НЕ ЗАВАЛИ!',
    desc: 'Одна вежа на всіх, ходи по черзі: тап — скинути свій блок. Промахнувся — вибув. Хто чекає, тапами дме вітер!',
    create(E) {
      const BH = 0.055; // висота блока (частка висоти арени)
      let blocks = [], debris = [], order = [], turn = 0, slider = null, wait = 0.6, wind = 0, msg = '', msgT = 0;
      const bt = {};
      const cur = () => order[turn % order.length];
      function nextTurn() {
        if (!E.alive().length) return;
        do turn = (turn + 1) % order.length;
        while (E.out[order[turn]]);
        const top = blocks[blocks.length - 1];
        const left = top.x + top.w / 2 > 0.5;
        // кожен новий блок трохи вужчий — вежа з часом стає підступнішою
        const w = Math.max(0.08, top.w * 0.96);
        slider = { x: left ? 0 : 1 - w, w, dir: left ? 1 : -1 };
        wind = 0;
        wait = 0.3;
        const p = E.byId(cur());
        // похибка бота — як у людини: чим швидший блок, тим більший промах
        bt[p.id] = { k: U.lerp(0.1, 0.04, E.skill) * U.rand(0.3, 1.3) };
      }
      return {
        init() {
          blocks = [{ x: 0.2, w: 0.6, owner: -1 }];
          order = U.shuffle(E.players.map((p) => p.id));
          turn = -1;
          nextTurn();
        },
        update(dt) {
          msgT = Math.max(0, msgT - dt);
          for (const d of debris) {
            d.vy += 3 * dt;
            d.y -= d.vy * dt;
            d.rot += d.vr * dt;
          }
          debris = debris.filter((d) => d.y > -6);
          if (!slider) return;
          if (wait > 0) {
            wait -= dt;
            return;
          }
          wind = Math.max(0, wind - dt * 0.25);
          const v = (0.6 + blocks.length * 0.07) * (1 + wind);
          slider.x += slider.dir * v * dt;
          if (slider.x < 0) { slider.x = -slider.x; slider.dir = 1; }
          if (slider.x > 1 - slider.w) { slider.x = 2 * (1 - slider.w) - slider.x; slider.dir = -1; }
        },
        bot(p) {
          if (!slider || wait > 0) return;
          if (p.id === cur()) {
            const top = blocks[blocks.length - 1];
            const v = (0.6 + blocks.length * 0.07) * (1 + wind);
            if (Math.abs(slider.x + slider.w / 2 - (top.x + top.w / 2)) < bt[p.id].k * v && Math.random() < 0.3) E.tap(p.id);
          } else if (Math.random() < 0.04 * (0.5 + E.skill)) E.tap(p.id);
        },
        press(p) {
          if (!slider || wait > 0) return;
          if (p.id !== cur()) {
            // вітер від суперників
            wind = Math.min(0.9, wind + 0.06);
            G.sfx('whoosh');
            return;
          }
          const top = blocks[blocks.length - 1];
          let x = slider.x, w = slider.w;
          const lvl = blocks.length;
          if (Math.abs(x + w / 2 - (top.x + top.w / 2)) < 0.015) {
            x = top.x + (top.w - w) / 2;
            msg = 'ІДЕАЛЬНО!';
            msgT = 0.9;
            G.sfx('coin');
            E.hitstop(0.06);
          } else G.sfx('thud');
          const l = Math.max(x, top.x), r = Math.min(x + w, top.x + top.w);
          if (r - l <= 0.01) {
            debris.push({ x, w, y: lvl, vy: 0, rot: 0, vr: U.rand(-3, 3), owner: p.id });
            slider = null;
            E.shake(9);
            E.eliminate(p.id);
            msg = p.name.toUpperCase() + ' ПРОМАХНУВСЯ!';
            msgT = 1.4;
            if (E.lastStanding()) return;
            E.after(0.9, nextTurn);
            return;
          }
          if (x < l) debris.push({ x, w: l - x, y: lvl, vy: 0, rot: 0, vr: -2.5, owner: p.id });
          if (x + w > r) debris.push({ x: r, w: x + w - r, y: lvl, vy: 0, rot: 0, vr: 2.5, owner: p.id });
          blocks.push({ x: l, w: r - l, owner: p.id });
          E.shake(2);
          slider = null;
          E.after(0.15, nextTurn);
        },
        label(p) {
          if (E.out[p.id]) return null;
          return slider && p.id === cur() ? 'ТВІЙ ХІД!' : 'ВІТЕР';
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const tw = Math.min(ar.w * 0.8, 70 * u), tx = ar.cx - tw / 2;
          const bh = ar.h * BH;
          // камера: верхівка вежі завжди в середині
          const visible = Math.floor((ar.h * 0.55) / bh);
          const shift = Math.max(0, blocks.length - visible);
          const baseY = ar.y + ar.h * 0.88;
          const yOf = (k) => baseY - (k - shift + 1) * bh;
          g.fillStyle = '#1D1838';
          g.fillRect(tx - 6 * u, baseY, tw + 12 * u, ar.h * 0.12);
          blocks.forEach((b, k) => {
            const y = yOf(k);
            if (y > ar.y + ar.h) return;
            const c = b.owner < 0 ? { c: '#8D86B0', d: '#5A5380' } : G.COLORS[b.owner];
            g.fillStyle = c.d;
            g.fillRect(tx + b.x * tw, y + bh * 0.15, b.w * tw, bh * 0.85);
            g.fillStyle = c.c;
            g.fillRect(tx + b.x * tw, y, b.w * tw, bh * 0.8);
            g.fillStyle = 'rgba(255,255,255,0.25)';
            g.fillRect(tx + b.x * tw, y, b.w * tw, bh * 0.16);
          });
          for (const d of debris) {
            g.save();
            g.translate(tx + (d.x + d.w / 2) * tw, yOf(d.y) + bh / 2);
            g.rotate(d.rot);
            g.fillStyle = U.shade(G.COLORS[d.owner].c, -0.2);
            g.fillRect((-d.w / 2) * tw, -bh * 0.4, d.w * tw, bh * 0.8);
            g.restore();
          }
          if (slider && order.length) {
            const p = E.byId(cur());
            const y = yOf(blocks.length) - (wait > 0 ? wait * bh * 2 : 0);
            g.globalAlpha = wait > 0 ? 0.5 : 1;
            g.fillStyle = p.color.c;
            g.fillRect(tx + slider.x * tw, y, slider.w * tw, bh * 0.8);
            g.globalAlpha = 1;
            if (wind > 0.05) {
              g.strokeStyle = `rgba(220,240,255,${wind * 0.6})`;
              g.lineWidth = 2;
              for (let i = 0; i < 4; i++) {
                const wx = ((E.t * 1.6 + i * 0.27) % 1) * ar.w;
                g.beginPath();
                g.moveTo(ar.x + wx, y - bh * (i - 1.5));
                g.lineTo(ar.x + wx + 12 * u, y - bh * (i - 1.5));
                g.stroke();
              }
            }
            // стрілка до гравця, чий хід
            const h = E.home(p, 16 * u);
            g.strokeStyle = U.alpha(p.color.c, 0.6);
            g.lineWidth = 1.2 * u;
            g.setLineDash([2 * u, 2 * u]);
            g.beginPath();
            g.moveTo(tx + (slider.x + slider.w / 2) * tw, y + bh / 2);
            g.lineTo(h.x, h.y);
            g.stroke();
            g.setLineDash([]);
          }
          for (const p of E.players) {
            const h = E.home(p, (p.corner ? 12 : 10) * u);
            const mine = slider && order.length && cur() === p.id;
            E.avatar(g, h.x, h.y, 6.5 * u, p, E.out[p.id] ? 'out' : mine ? 'scared' : 'sly', p.rot);
          }
          E.dual(g, (x, y) => E.txt(g, String(blocks.length - 1), x, y, 6 * u, 'rgba(246,241,255,0.35)', { weight: 900 }), 36 * u, true);
          if (msgT > 0) E.dual(g, (x, y) => E.txt(g, msg, x, y, 4.6 * u, '#FFE7A3', { stroke: '#141029' }), 26 * u, true);
        },
      };
    },
  });
})();
