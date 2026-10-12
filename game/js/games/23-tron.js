(function () {
  const { U } = G;
  G.game({
    id: 'tron', name: 'Світлові байки', icon: '🏍️', tag: 'Виживання', bg: '#070A1A', btn: 'ПРАВОРУЧ',
    desc: 'Байк їде сам і лишає світлий слід. Кожне натискання — поворот праворуч (ліворуч повернути не можна — плануйте заздалегідь!). Врізався в стіну чи в слід — вибув. Останній, хто їде, перемагає.',
    create(E) {
      const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
      let c = 8, cols = 0, rows = 0, ox = 0, oy = 0, occ = null, seen = null, stamp = 1;
      let acc = 0, step = 0;
      const B = {};
      const idx = (x, y) => y * cols + x;
      const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && occ[idx(x, y)] === 0;
      function area(x, y, limit) {
        if (!free(x, y)) return 0;
        stamp++;
        const q = [x, y];
        seen[idx(x, y)] = stamp;
        let n = 0;
        while (q.length && n < limit) {
          const yy = q.pop(), xx = q.pop();
          n++;
          for (let d = 0; d < 4; d++) {
            const nx = xx + DX[d], ny = yy + DY[d];
            if (free(nx, ny) && seen[idx(nx, ny)] !== stamp) {
              seen[idx(nx, ny)] = stamp;
              q.push(nx, ny);
            }
          }
        }
        return n;
      }
      return {
        init() {
          const ar = E.arena;
          c = Math.max(6, Math.round(ar.u * 2.5));
          cols = Math.floor(ar.w / c);
          rows = Math.floor(ar.h / c);
          ox = ar.x + (ar.w - cols * c) / 2;
          oy = ar.y + (ar.h - rows * c) / 2;
          occ = new Uint8Array(cols * rows);
          seen = new Uint32Array(cols * rows);
          const m = 4;
          const starts = E.n >= 3
            ? [[m, rows - 1 - m, 3], [cols - 1 - m, m, 1], [m, m, 0], [cols - 1 - m, rows - 1 - m, 2]]
            : [[Math.floor(cols / 2) - 2, rows - 1 - m, 3], [Math.floor(cols / 2) + 2, m, 1]];
          for (const p of E.players) {
            const [x, y, d] = starts[p.seat];
            B[p.id] = { x, y, d, q: 0, decided: -1 };
            occ[idx(x, y)] = p.id + 1;
          }
        },
        update(dt) {
          const speed = 8 + Math.min(6, E.playT * 0.16);
          acc += dt * speed;
          while (acc >= 1 && E.phase === 'play') {
            acc -= 1;
            step++;
            const al = E.alive();
            const next = {};
            for (const p of al) {
              const b = B[p.id];
              if (b.q > 0) {
                b.d = (b.d + 1) % 4;
                b.q--;
              }
              next[p.id] = [b.x + DX[b.d], b.y + DY[b.d]];
            }
            const dead = [];
            for (const p of al) {
              const [x, y] = next[p.id];
              let crash = !free(x, y);
              for (const o of al) if (o.id !== p.id && next[o.id][0] === x && next[o.id][1] === y) crash = true;
              if (crash) dead.push(p.id);
            }
            for (const p of al) {
              if (dead.includes(p.id)) continue;
              const b = B[p.id];
              [b.x, b.y] = next[p.id];
              occ[idx(b.x, b.y)] = p.id + 1;
            }
            for (const id of dead) {
              const b = B[id];
              E.burst(ox + (b.x + 0.5) * c, oy + (b.y + 0.5) * c, [G.COLORS[id].c, '#fff'], 24);
              E.eliminate(id);
            }
            if (dead.length) {
              E.shake(4);
              if (E.lastStanding(dead)) return;
            }
          }
        },
        bot(p) {
          const b = B[p.id];
          if (b.decided === step) return;
          b.decided = step;
          if (b.q > 0) return;
          const look = Math.round(U.lerp(25, 260, E.skill));
          const r = (b.d + 1) % 4;
          const aS = area(b.x + DX[b.d], b.y + DY[b.d], look);
          const aR = area(b.x + DX[r], b.y + DY[r], look);
          let turn = false;
          if (aS === 0) turn = aR > 0;
          else if (aR > aS * 1.15 + 3) turn = true;
          else if (aR >= look * 0.9 && Math.random() < 0.02 + (1 - E.skill) * 0.04) turn = true;
          if (turn) E.tap(p.id);
        },
        press(p) {
          const b = B[p.id];
          if (b.q < 2) b.q++;
          G.sfx('tap', p.seat);
        },
        draw(g) {
          const ar = E.arena;
          g.fillStyle = '#070A1A';
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          g.strokeStyle = 'rgba(80,120,255,0.08)';
          g.lineWidth = 1;
          for (let x = 0; x <= cols; x += 4) { g.beginPath(); g.moveTo(ox + x * c, oy); g.lineTo(ox + x * c, oy + rows * c); g.stroke(); }
          for (let y = 0; y <= rows; y += 4) { g.beginPath(); g.moveTo(ox, oy + y * c); g.lineTo(ox + cols * c, oy + y * c); g.stroke(); }
          g.strokeStyle = 'rgba(120,160,255,0.5)';
          g.lineWidth = 2;
          g.strokeRect(ox, oy, cols * c, rows * c);
          for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
              const v = occ[idx(x, y)];
              if (!v) continue;
              const id = v - 1;
              g.fillStyle = E.out[id] ? U.alpha(G.COLORS[id].c, 0.35) : G.COLORS[id].c;
              g.fillRect(ox + x * c + 1, oy + y * c + 1, c - 2, c - 2);
            }
          for (const p of E.players) {
            const b = B[p.id];
            if (E.out[p.id]) continue;
            g.fillStyle = '#fff';
            g.fillRect(ox + b.x * c, oy + b.y * c, c, c);
            g.strokeStyle = p.color.c;
            g.lineWidth = 2;
            g.strokeRect(ox + b.x * c - 2, oy + b.y * c - 2, c + 4, c + 4);
          }
        },
      };
    },
  });
})();
