(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'duel', name: 'Дуель', icon: '🤠', tag: 'Реакція', bg: '#2A1A1F', btn: 'ВОГОНЬ',
    desc: 'Чекайте на слово «ВОГОНЬ!» і тисніть першими. Інші слова — пастка: хто поспішив, пропускає раунд. До 3 очок.',
    create(E) {
      const WIN = 3;
      const FAKES = [['ВОДА!', '#3AA8FF'], ['ВОРОНА!', '#C9C2EA'], ['ВОГНИК?', '#FFC530'], ['ВОВК!', '#35D486'], ['ВОГКО!', '#FF7AD9'], ['ВОГ… НІ!', '#FF9E4A']];
      const sc = {}, foul = {}, botT = {};
      let st, t, fireAt, fakes, sign, signCol, hitBy, endT, flash = 0;

      function round() {
        st = 'wait';
        t = 0;
        fireAt = U.rand(1.8, 4.8);
        sign = 'ЧЕКАЙ…';
        signCol = '#8D86B0';
        hitBy = null;
        fakes = [];
        const nf = Math.random() < 0.7 ? U.randi(1, 2) : 0;
        for (let i = 0; i < nf; i++) fakes.push({ at: U.rand(0.7, fireAt - 0.6), done: false, until: 0 });
        E.players.forEach((p) => {
          foul[p.id] = false;
          botT[p.id] = null;
        });
      }
      function seatPos(p) {
        return E.home(p, (p.corner ? 15 : 13) * E.arena.u);
      }
      function endRound(id) {
        hitBy = id;
        st = 'hit';
        endT = t + 1.3;
      }
      return {
        init() {
          E.players.forEach((p) => (sc[p.id] = 0));
          round();
        },
        update(dt) {
          t += dt;
          flash = Math.max(0, flash - dt * 3);
          if (st === 'wait') {
            for (const f of fakes) {
              if (!f.done && t >= f.at) {
                f.done = true;
                f.until = t + 0.75;
                const fk = U.pick(FAKES);
                sign = fk[0];
                signCol = fk[1];
                G.sfx('beep');
                E.players.forEach((p) => {
                  if (p.bot && Math.random() < (1 - E.skill) * 0.32) botT[p.id] = t + U.rand(0.25, 0.5);
                });
              }
            }
            if (sign !== 'ЧЕКАЙ…' && !fakes.some((f) => f.done && t < f.until)) {
              sign = 'ЧЕКАЙ…';
              signCol = '#8D86B0';
            }
            if (t >= fireAt) {
              st = 'fire';
              sign = 'ВОГОНЬ!';
              signCol = '#FF5468';
              flash = 1;
              G.sfx('go');
              E.shake(5);
              E.players.forEach((p) => {
                if (p.bot && !foul[p.id]) botT[p.id] = t + U.lerp(0.62, 0.23, E.skill) + U.rand(0, 0.2);
              });
            }
          } else if (st === 'hit' && t >= endT) {
            const champ = E.players.find((p) => sc[p.id] >= WIN);
            if (champ) E.finish([champ.id]);
            else round();
          }
        },
        bot(p) {
          if (botT[p.id] != null && t >= botT[p.id]) {
            botT[p.id] = null;
            E.tap(p.id);
          }
        },
        press(p) {
          if (st === 'wait') {
            if (foul[p.id]) return;
            foul[p.id] = true;
            G.sfx('bad');
            const sp = seatPos(p);
            E.float(sp.x, sp.y - 6 * E.arena.u, 'РАНО!', '#FF5468', p.rot);
            if (E.players.every((q) => foul[q.id])) endRound(null);
          } else if (st === 'fire') {
            if (foul[p.id]) return;
            sc[p.id]++;
            G.sfx('point');
            const sp = seatPos(p);
            E.burst(sp.x, sp.y, p.color.c, 26);
            endRound(p.id);
          }
        },
        label(p) {
          return foul[p.id] && st !== 'hit' ? 'РАНО!' : null;
        },
        draw(g) {
          const ar = E.arena, u = ar.u;
          // небо-сутінки
          const gr = g.createLinearGradient(0, ar.y, 0, ar.y + ar.h);
          gr.addColorStop(0, '#3A1D33');
          gr.addColorStop(0.5, '#5A2A2E');
          gr.addColorStop(1, '#3A1D33');
          g.fillStyle = gr;
          g.fillRect(ar.x, ar.y, ar.w, ar.h);
          if (flash > 0) {
            g.fillStyle = `rgba(255,84,104,${flash * 0.35})`;
            g.fillRect(ar.x, ar.y, ar.w, ar.h);
          }
          // лінії пострілу
          if (st === 'hit' && hitBy != null) {
            const p = E.byId(hitBy), sp = seatPos(p);
            g.strokeStyle = p.color.c;
            g.lineWidth = 3 * u;
            g.setLineDash([3 * u, 2 * u]);
            g.beginPath();
            g.moveTo(sp.x, sp.y);
            g.lineTo(ar.cx, ar.cy);
            g.stroke();
            g.setLineDash([]);
          }
          // гравці
          for (const p of E.players) {
            const sp = seatPos(p);
            g.beginPath();
            g.arc(sp.x, sp.y, 9 * u, 0, TAU);
            g.fillStyle = foul[p.id] ? '#3B3350' : p.color.d;
            g.fill();
            g.lineWidth = 1.2 * u;
            g.strokeStyle = p.color.c;
            g.stroke();
            E.emoji(g, '🤠', sp.x, sp.y, 11 * u, p.rot);
            if (foul[p.id] && st !== 'hit') {
              g.strokeStyle = '#FF5468';
              g.lineWidth = 2 * u;
              g.beginPath();
              g.moveTo(sp.x - 6 * u, sp.y - 6 * u);
              g.lineTo(sp.x + 6 * u, sp.y + 6 * u);
              g.moveTo(sp.x + 6 * u, sp.y - 6 * u);
              g.lineTo(sp.x - 6 * u, sp.y + 6 * u);
              g.stroke();
            }
            E.hud(g, p, '★'.repeat(sc[p.id]) + '☆'.repeat(WIN - sc[p.id]), { color: p.color.l });
          }
          // табло
          const R = 21 * u;
          g.beginPath();
          g.arc(ar.cx, ar.cy, R, 0, TAU);
          g.fillStyle = st === 'fire' ? '#FF5468' : '#1E1328';
          g.fill();
          g.lineWidth = 2 * u;
          g.strokeStyle = st === 'fire' ? '#FFE7A3' : 'rgba(255,255,255,0.18)';
          g.stroke();
          let txt = sign, col = st === 'fire' ? '#fff' : signCol;
          if (st === 'hit') {
            txt = hitBy == null ? 'УСІ РАНО' : '+1';
            col = hitBy == null ? '#C9C2EA' : E.byId(hitBy).color.c;
          }
          const fs = txt.length > 6 ? 5.2 * u : 7 * u;
          E.dual(g, (cx, cy) => E.txt(g, txt, cx, cy, fs, col, { weight: 900 }), E.needDual ? 7.5 * u : 0);
        },
      };
    },
  });
})();
