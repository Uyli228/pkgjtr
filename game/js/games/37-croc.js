(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'croc', name: 'Крокодил', icon: '🐊', tag: 'Удача', bg: '#173326', btn: 'НАТИСНИ',
    verb: 'НЕ ВКУСИ!',
    desc: 'По черзі тисни зуб. Один кусається — хто його натиснув, вибув.',
    create(E) {
      let teeth = [], bad = 0, order = [], turn = -1, sel = 0, dir = 1, selT = 0, turnT = 0, st = 'turn', biteT = 0, bitten = null;
      const cur = () => order[turn];
      function newCroc() {
        const n = 6 + E.alive().length * 2;
        teeth = Array.from({ length: n }, () => ({ down: false }));
        bad = U.randi(0, n - 1);
        st = 'turn';
        bitten = null;
      }
      function nextTurn() {
        do turn = (turn + 1) % order.length;
        while (E.out[order[turn]]);
        turnT = 0;
        sel = teeth.findIndex((t) => !t.down);
        dir = 1;
        selT = 0;
        const p = E.byId(cur());
        p._botAt = U.rand(0.6, 2.2);
      }
      return {
        init() {
          order = U.shuffle(E.players.map((p) => p.id));
          newCroc();
          nextTurn();
        },
        update(dt) {
          biteT = Math.max(0, biteT - dt);
          if (st === 'bite') {
            turnT += dt;
            if (turnT > 1.5) {
              if (E.lastStanding()) return;
              newCroc();
              nextTurn();
            }
            return;
          }
          turnT += dt;
          // курсор бігає по зубах (пропускає натиснуті)
          selT += dt;
          if (selT > 0.42) {
            selT = 0;
            for (let k = 0; k < teeth.length; k++) {
              sel += dir;
              if (sel >= teeth.length) { sel = teeth.length - 1; dir = -1; }
              if (sel < 0) { sel = 0; dir = 1; }
              if (!teeth[sel].down) break;
            }
          }
          if (turnT > 5) this.pressTooth(E.byId(cur()));
        },
        pressTooth(p) {
          if (st !== 'turn' || p.id !== cur() || teeth[sel].down) return;
          teeth[sel].down = true;
          if (sel === bad) {
            st = 'bite';
            turnT = 0;
            biteT = 1;
            bitten = p.id;
            E.shake(10);
            E.hitstop(0.12);
            E.eliminate(p.id);
            return;
          }
          G.sfx('tap', 2);
          nextTurn();
        },
        bot(p) {
          if (st === 'turn' && p.id === cur() && turnT >= p._botAt) E.tap(p.id);
        },
        press(p) {
          this.pressTooth(p);
        },
        label(p) {
          if (E.out[p.id]) return null;
          return st === 'turn' && p.id === cur() ? 'ТВІЙ ХІД!' : 'ЧЕКАЙ';
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const cx = ar.cx, cy = ar.cy;
          const W = Math.min(ar.w * 0.8, 80 * u);
          const close = st === 'bite' ? Math.min(1, (1 - biteT) * 4) : 0;
          // верхня й нижня щелепи
          const gap = (16 - close * 14) * u;
          g.fillStyle = '#2F8F4E';
          U.rr(g, cx - W / 2, cy - gap - 18 * u, W, 18 * u, 8 * u);
          g.fill();
          U.rr(g, cx - W / 2, cy + gap, W, 18 * u, 8 * u);
          g.fill();
          g.fillStyle = '#E86A7A';
          g.fillRect(cx - W / 2 + 4 * u, cy - gap, W - 8 * u, gap * 2);
          // очі
          g.fillStyle = '#FFE15A';
          for (const s of [-1, 1]) {
            g.beginPath();
            g.arc(cx + s * W * 0.32, cy - gap - 18 * u, 4 * u, 0, TAU);
            g.fill();
            g.fillStyle = '#1A1233';
            g.fillRect(cx + s * W * 0.32 - 0.6 * u, cy - gap - 21 * u, 1.2 * u, 6 * u);
            g.fillStyle = '#FFE15A';
          }
          // зуби на нижній щелепі
          const n = teeth.length, tw = (W - 10 * u) / n;
          teeth.forEach((t, i) => {
            const x = cx - W / 2 + 5 * u + i * tw;
            const h = t.down ? 2 * u : 6 * u;
            g.fillStyle = t.down ? '#C9C2B0' : '#FFFDF4';
            g.beginPath();
            g.moveTo(x + tw * 0.12, cy + gap);
            g.lineTo(x + tw * 0.5, cy + gap - h);
            g.lineTo(x + tw * 0.88, cy + gap);
            g.fill();
            if (i === sel && st === 'turn') {
              const p = E.byId(cur());
              E.emoji(g, '👇', x + tw / 2, cy + gap - 11 * u + Math.sin(E.t * 10) * u, 7 * u);
              g.strokeStyle = p.color.c;
              g.lineWidth = 0.6 * u;
              g.strokeRect(x + 1, cy + gap - 7 * u, tw - 2, 8 * u);
            }
          });
          for (const p of E.players) {
            const h = E.home(p, 12 * u);
            const mine = st === 'turn' && p.id === cur();
            E.avatar(g, h.x, h.y, (mine ? 7.5 : 6) * u, p, E.out[p.id] ? 'out' : mine ? 'scared' : 'sly', p.rot);
          }
        },
      };
    },
  });
})();
