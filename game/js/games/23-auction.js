(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'auction', name: 'Аукціон наосліп', icon: '🎁', tag: 'Блеф', bg: '#1A1F33', btn: 'ТРИМАЙ',
    desc: 'На кону коробка: усередині подарунок (+очки) або бомба (−очки), видно лише шанс. Затисніть, щоб торгуватися: поки тримаєте, ціна росте. Відпустив — вийшов. Останній, хто тримає, платить ціну й забирає коробку. Дивіться в обличчя суперникам!',
    create(E) {
      const LOTS = 5, CAP = 12;
      const sc = {}, inBid = {}, val = {};
      let lot = 0, st = 'ready', t = 0, price = 0, V = 0, chance = 0, gift = true, winner = null, paid = 0;
      function newLot() {
        lot++;
        st = 'ready';
        t = 0;
        price = 0;
        winner = null;
        V = U.randi(3, 9);
        chance = U.pick([0.2, 0.35, 0.5, 0.65, 0.8]);
        gift = Math.random() < chance;
        E.players.forEach((p) => {
          inBid[p.id] = false;
          // оцінка бота: очікувана цінність + власний характер
          val[p.id] = V * (2 * chance - 1) + U.gauss() * U.lerp(2.2, 0.8, E.skill) + (Math.random() < 0.2 ? 2 : 0);
        });
      }
      function close(w) {
        winner = w;
        st = 'reveal';
        t = 0;
        paid = Math.floor(price);
        if (w != null) {
          const delta = (gift ? V : -V) - paid;
          sc[w] += delta;
          const p = E.byId(w);
          G.sfx(gift ? 'win' : 'boom');
          if (!gift) E.shake(8);
          E.burst(E.arena.cx, E.arena.cy, gift ? [p.color.c, '#FFC530', '#fff'] : ['#FF5468', '#FF9E4A'], 40);
        } else G.sfx('draw');
      }
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          newLot();
        },
        update(dt) {
          t += dt;
          if (st === 'ready') {
            if (t >= 2.2) {
              E.players.forEach((p) => (inBid[p.id] = !!E.down[p.id]));
              const n = E.players.filter((p) => inBid[p.id]).length;
              if (n === 0) return close(null);
              if (n === 1) return close(E.players.find((p) => inBid[p.id]).id);
              st = 'bid';
              t = 0;
              G.sfx('go');
            }
          } else if (st === 'bid') {
            price += dt * (1.3 + t * 0.12);
            const left = E.players.filter((p) => inBid[p.id]);
            if (price >= CAP) {
              price = CAP;
              return close(null);
            }
            if (left.length <= 1) return close(left.length ? left[0].id : null);
          } else if (st === 'reveal' && t > 2.4) {
            if (lot >= LOTS) return E.finish(E.best(sc, 'max'), 'Рахунок: ' + Math.max(...E.players.map((p) => sc[p.id])));
            newLot();
          }
        },
        bot(p) {
          if (st === 'ready') {
            const want = val[p.id] > 0.3 || Math.random() < 0.004;
            if (t > 0.3 && want !== E.down[p.id]) E.hold(p.id, want);
          } else if (st === 'bid' && inBid[p.id] && price >= val[p.id]) E.hold(p.id, false);
        },
        release(p) {
          if (st === 'bid' && inBid[p.id]) {
            inBid[p.id] = false;
            G.sfx('tap', 1);
          }
        },
        label(p) {
          if (st === 'ready') return E.down[p.id] ? 'В ГРІ ✓' : 'ЗАТИСНИ';
          if (st === 'bid') return inBid[p.id] ? 'ТРИМАЮ…' : 'ПАС';
          return winner === p.id ? 'КУПИВ' : 'ПАС';
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // молоток і стіл
          g.fillStyle = '#232A45';
          g.beginPath();
          g.arc(ar.cx, ar.cy, 30 * u, 0, TAU);
          g.fill();
          // коробка
          const s = 12 * u;
          const shake = st === 'bid' ? Math.sin(E.t * 30) * price * 0.08 * u : 0;
          const open = st === 'reveal';
          if (!open || winner == null) {
            g.fillStyle = '#C9473F';
            g.fillRect(ar.cx - s + shake, ar.cy - s * 0.7, s * 2, s * 1.6);
            g.fillStyle = '#E25B52';
            g.fillRect(ar.cx - s * 1.1 + shake, ar.cy - s * 0.95, s * 2.2, s * 0.45);
            g.fillStyle = '#FFC530';
            g.fillRect(ar.cx - s * 0.15 + shake, ar.cy - s * 0.95, s * 0.3, s * 1.85);
            E.txt(g, '?', ar.cx + shake, ar.cy + s * 0.25, s, '#fff', { stroke: '#7A1E2A' });
          } else {
            E.emoji(g, gift ? '🎁' : '💣', ar.cx, ar.cy, s * 2.4);
          }
          // інформація про лот
          const info = open
            ? winner == null
              ? 'НІХТО НЕ КУПИВ'
              : (gift ? `ПОДАРУНОК +${V}` : `БОМБА −${V}`) + `, ціна ${paid}`
            : `ЦІННІСТЬ ${V} · ШАНС ПОДАРУНКА ${Math.round(chance * 100)}%`;
          E.dual(g, (x, y) => E.txt(g, info, x, y, Math.min(3.6 * u, 15), open && winner != null ? (gift ? '#35D486' : '#FF5468') : '#F6F1FF', { weight: 800 }), 22 * u, true);
          const big = st === 'ready' ? 'ЗАТИСНІТЬ!' : st === 'bid' ? 'ЦІНА ' + Math.floor(price) : '';
          if (big) E.dual(g, (x, y) => E.txt(g, big, x, y, 6 * u, st === 'bid' ? '#FFC530' : '#3AA8FF', { stroke: '#1A1F33' }), 31 * u, true);
          E.dual(g, (x, y) => E.txt(g, `ЛОТ ${Math.min(lot, LOTS)}/${LOTS}`, x, y, 3.2 * u, 'rgba(246,241,255,0.5)', { body: true, weight: 800 }), 39 * u, true);
          for (const p of E.players) {
            const q = E.home(p, (p.corner ? 12 : 10) * u);
            const active = (st === 'ready' && E.down[p.id]) || (st === 'bid' && inBid[p.id]) || (open && winner === p.id);
            g.beginPath();
            g.arc(q.x, q.y, 6.5 * u, 0, TAU);
            g.fillStyle = active ? p.color.c : '#2C2747';
            g.fill();
            g.strokeStyle = p.color.c;
            g.lineWidth = 0.8 * u;
            g.stroke();
            E.emoji(g, active ? '✋' : '🤷', q.x, q.y, 7 * u, p.rot);
            E.hud(g, p, String(sc[p.id]), { color: p.color.l, size: 5 * u });
          }
        },
      };
    },
  });
})();
