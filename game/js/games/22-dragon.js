(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'dragon', name: 'Сплячий дракон', icon: '🐉', tag: 'Жадібність', bg: '#1E1424', btn: 'ХАП',
    desc: 'Кожне натискання — монета з драконячого скарбу. Але кожен «хап» потроху будить дракона. Коли він прокинеться, усі, хто хапав в останню секунду, втрачають весь улов раунду. Вчасно зупинись! Три раунди.',
    create(E) {
      const ROUNDS = 3;
      const bank = {}, haul = {}, lastT = {}, bt = {}, risk = {};
      let round = 0, m = 0, wakeAt = 1, st = 'sleep', pause = 0, fireT = 0, burnt = [];
      function newRound() {
        round++;
        m = 0;
        wakeAt = U.rand(0.55, 1);
        st = 'sleep';
        burnt = [];
        E.players.forEach((p) => {
          haul[p.id] = 0;
          lastT[p.id] = -9;
          bt[p.id] = U.rand(0.2, 0.6);
          risk[p.id] = U.rand(0.45, 0.85) * U.lerp(1.1, 0.95, E.skill);
        });
      }
      const pos = (p) => E.home(p, (p.corner ? 12 : 11) * E.arena.u);
      return {
        init() {
          E.players.forEach((p) => (bank[p.id] = 0));
          newRound();
        },
        update(dt) {
          fireT = Math.max(0, fireT - dt);
          if (st === 'awake') {
            pause -= dt;
            if (pause <= 0) {
              if (round >= ROUNDS) return E.finish(E.best(bank, 'max'), 'Найбільший скарб: ' + Math.max(...E.players.map((p) => bank[p.id])));
              newRound();
            }
            return;
          }
          m += dt * 0.02;
          if (m >= wakeAt) {
            st = 'awake';
            pause = 2.4;
            fireT = 1.2;
            G.sfx('boom');
            E.shake(9);
            for (const p of E.players) {
              if (E.playT - lastT[p.id] < 1) {
                burnt.push(p.id);
                const q = pos(p);
                E.burst(q.x, q.y, ['#FF5468', '#FF9E4A', '#FFC530'], 30);
                if (haul[p.id]) E.float(q.x, q.y, '−' + haul[p.id], '#FF5468', p.rot);
                haul[p.id] = 0;
              } else bank[p.id] += haul[p.id];
            }
          }
        },
        bot(p, dt) {
          if (st !== 'sleep') return;
          bt[p.id] -= dt;
          if (bt[p.id] > 0) return;
          bt[p.id] = U.rand(0.15, 0.3);
          // бот бачить те саме, що й люди: наскільки дракон неспокійний (з похибкою)
          const seen = m / wakeAt + U.gauss() * U.lerp(0.15, 0.05, E.skill);
          if (seen < risk[p.id]) E.tap(p.id);
        },
        press(p) {
          if (st !== 'sleep') return;
          haul[p.id]++;
          lastT[p.id] = E.playT;
          m += 1 / (12 * E.n);
          G.sfx('coin');
        },
        label(p) {
          if (st === 'awake') return burnt.includes(p.id) ? 'ЗГОРІВ!' : 'ВРЯТУВАВ';
          return null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          const k = U.clamp(m / wakeAt, 0, 1);
          // печера
          const gr = g.createRadialGradient(ar.cx, ar.cy, 5 * u, ar.cx, ar.cy, ar.h * 0.6);
          gr.addColorStop(0, '#3A2238');
          gr.addColorStop(1, '#140D1A');
          g.fillStyle = gr;
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          // скарб
          for (let i = 0; i < 26; i++) {
            const a = i * 2.4, r = (4 + (i % 7) * 2.2) * u;
            g.fillStyle = i % 3 ? '#FFC530' : '#FFE7A3';
            g.beginPath();
            g.ellipse(ar.cx + Math.cos(a) * r * 1.5, ar.cy + 10 * u + Math.sin(a) * r * 0.5, 2 * u, 1.3 * u, 0, 0, TAU);
            g.fill();
          }
          // дракон
          const breath = Math.sin(E.t * (2 + k * 5)) * u * (0.6 + k);
          const cx = ar.cx, cy = ar.cy - 4 * u;
          g.fillStyle = '#7A2C3C';
          g.beginPath();
          g.ellipse(cx, cy, 20 * u + breath, 12 * u + breath * 0.6, 0, 0, TAU);
          g.fill();
          g.fillStyle = '#9C3A4C';
          for (let i = -2; i <= 2; i++) {
            g.beginPath();
            g.moveTo(cx + i * 6 * u - 2.5 * u, cy - 11 * u);
            g.lineTo(cx + i * 6 * u, cy - 16 * u - breath);
            g.lineTo(cx + i * 6 * u + 2.5 * u, cy - 11 * u);
            g.fill();
          }
          // голова
          g.fillStyle = '#8E3446';
          g.beginPath();
          g.ellipse(cx + 16 * u, cy + 3 * u, 9 * u, 6.5 * u, 0.2, 0, TAU);
          g.fill();
          const awake = st === 'awake';
          const open = awake ? 1 : Math.max(0, (k - 0.35) / 0.65) * 0.6 + Math.max(0, Math.sin(E.t * 3)) * k * 0.15;
          g.fillStyle = '#FFE15A';
          g.beginPath();
          g.ellipse(cx + 18 * u, cy + 0.5 * u, 2.4 * u, Math.max(0.25, 2.4 * open) * u, 0, 0, TAU);
          g.fill();
          if (open > 0.2) {
            g.fillStyle = '#1A1233';
            g.fillRect(cx + 17.6 * u, cy + 0.5 * u - 2 * open * u, 0.8 * u, 4 * open * u);
          }
          // дим із ніздрів — підказка, що дракон близький до пробудження
          if (k > 0.65 && !awake) {
            for (let i = 0; i < 3; i++) {
              const t = (E.t * 0.8 + i / 3) % 1;
              g.fillStyle = `rgba(200,190,220,${(1 - t) * 0.5})`;
              g.beginPath();
              g.arc(cx + 25 * u + t * 6 * u, cy + 3 * u - t * 8 * u, (1 + t * 2.5) * u, 0, TAU);
              g.fill();
            }
          }
          if (!awake) {
            const z = (E.t * 0.7) % 1;
            g.globalAlpha = (1 - z) * (1 - k);
            E.txt(g, 'z', cx + 22 * u + z * 6 * u, cy - 8 * u - z * 10 * u, (3 + z * 3) * u, '#C9C2EA');
            g.globalAlpha = 1;
          }
          // вогонь
          if (fireT > 0) {
            for (const id of burnt) {
              const p = E.byId(id), q = pos(p);
              g.strokeStyle = `rgba(255,140,60,${fireT / 1.2})`;
              g.lineWidth = 7 * u * (fireT / 1.2);
              g.lineCap = 'round';
              g.beginPath();
              g.moveTo(cx + 22 * u, cy + 4 * u);
              g.lineTo(q.x, q.y);
              g.stroke();
              g.lineCap = 'butt';
            }
            if (!burnt.length) E.dual(g, (x, y) => E.txt(g, 'ПРОМАХ — НІКОГО!', x, y, 4.5 * u, '#FFC530', { stroke: '#140D1A' }), 26 * u, true);
          }
          for (const p of E.players) {
            const q = pos(p);
            g.fillStyle = burnt.includes(p.id) && awake ? '#4A4468' : p.color.c;
            g.beginPath();
            g.arc(q.x, q.y, 6.5 * u, 0, TAU);
            g.fill();
            E.txt(g, String(haul[p.id]), q.x, q.y + 0.3 * u, 5 * u, '#1A1233', { weight: 900 });
            E.hud(g, p, '💰 ' + bank[p.id], { color: p.color.l });
          }
          E.dual(g, (x, y) => E.txt(g, `РАУНД ${Math.min(round, ROUNDS)}/${ROUNDS}`, x, y, 3.2 * u, 'rgba(246,241,255,0.5)', { body: true, weight: 800 }), 34 * u, true);
        },
      };
    },
  });
})();
