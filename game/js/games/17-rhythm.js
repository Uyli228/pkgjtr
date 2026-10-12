(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'rhythm', name: 'Ритм-барабан', icon: '🥁', tag: 'Ритм', bg: '#1A1030', btn: 'БУМ', lanes: true,
    desc: 'Ноти падають до лінії. Тисніть саме тоді, коли нота торкається лінії: «Ідеально» — 3 очки, «Добре» — 2, «Ок» — 1. Зайве натискання — мінус очко.',
    create(E) {
      const BPM = 112, BEAT = 60 / BPM, LEAD = 1.5, HIT = 0.86;
      const SCALE = [392, 440, 523, 587, 659, 784, 880];
      // ноти однакові для всіх
      const chart = [];
      (function build() {
        const pats = [
          [0, 1, 2, 3], [0, 1, 2, 2.5, 3], [0, 0.5, 1, 2, 3], [0, 1, 1.5, 2, 3, 3.5],
          [0, 0.5, 1.5, 2, 3], [0, 1, 2, 2.5, 3, 3.5], [0, 0.75, 1.5, 2, 3], [0, 0.5, 1, 1.5, 2, 3],
        ];
        for (let bar = 0; bar < 9; bar++) {
          const pool = bar < 2 ? pats.slice(0, 2) : bar < 5 ? pats.slice(0, 5) : pats;
          const pat = U.pick(pool);
          for (const b of pat) chart.push({ t: 1 + (bar * 4 + b) * BEAT, f: U.pick(SCALE) });
        }
      })();
      const END = chart[chart.length - 1].t + 1.2;
      const S = {};
      let beatI = 0;
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { sc: 0, judged: new Array(chart.length).fill(null), msg: '', msgT: 0, msgC: '#fff', combo: 0, bi: 0 };
          }
        },
        update(dt) {
          const t = E.playT;
          // метроном
          while (beatI * BEAT * 0.5 + 1 <= t && beatI < 80) {
            G.sfx(beatI % 2 ? 'hat' : 'kick');
            beatI++;
          }
          for (const p of E.players) {
            const s = S[p.id];
            s.msgT = Math.max(0, s.msgT - dt);
            chart.forEach((n, i) => {
              if (s.judged[i] == null && t - n.t > 0.16) {
                s.judged[i] = 'miss';
                s.combo = 0;
                s.msg = 'МИМО';
                s.msgC = '#8D86B0';
                s.msgT = 0.5;
              }
            });
          }
          if (t > END) {
            const v = {};
            E.players.forEach((p) => (v[p.id] = S[p.id].sc));
            const w = E.best(v, 'max');
            E.finish(w, w.length ? `Рахунок: ${v[w[0]]}` : '');
          }
        },
        bot(p) {
          const s = S[p.id];
          const t = E.playT;
          for (let i = s.bi; i < chart.length; i++) {
            const n = chart[i];
            if (n.botAt == null) n.botAt = {};
            if (n.botAt[p.id] == null) {
              n.botAt[p.id] = Math.random() < (1 - E.skill) * 0.12 ? Infinity : n.t + U.gauss() * U.lerp(0.075, 0.022, E.skill);
            }
            const at = n.botAt[p.id];
            if (at === Infinity) {
              if (n.t < t) s.bi = i + 1;
              continue;
            }
            if (at > t) break;
            s.bi = i + 1;
            E.tap(p.id);
            break;
          }
        },
        press(p) {
          const s = S[p.id], t = E.playT;
          let best = -1, bd = 1;
          chart.forEach((n, i) => {
            if (s.judged[i] != null) return;
            const d = Math.abs(n.t - t);
            if (d < bd) {
              bd = d;
              best = i;
            }
          });
          if (best >= 0 && bd < 0.15) {
            const pts = bd < 0.05 ? 3 : bd < 0.1 ? 2 : 1;
            s.judged[best] = pts;
            s.sc += pts;
            s.combo++;
            s.msg = pts === 3 ? 'ІДЕАЛЬНО' : pts === 2 ? 'ДОБРЕ' : 'ОК';
            s.msgC = pts === 3 ? '#FFC530' : pts === 2 ? '#35D486' : '#3AA8FF';
            s.msgT = 0.5;
            G.sfx('note', chart[best].f);
          } else {
            s.sc = Math.max(0, s.sc - 1);
            s.combo = 0;
            s.msg = 'ЗАРАНО';
            s.msgC = '#FF5468';
            s.msgT = 0.5;
            G.sfx('tap');
          }
        },
        draw(g) {
          const t = E.phase === 'play' ? E.playT : E.phase === 'result' || E.phase === 'done' ? END : 0;
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              g.fillStyle = '#1A1030';
              g.fillRect(0, 0, w, h);
              const lw = Math.min(w * 0.42, m * 0.5);
              const lx = w / 2 - lw / 2;
              g.fillStyle = 'rgba(255,255,255,0.05)';
              g.fillRect(lx, 0, lw, h);
              // пульс доріжки
              const ph = ((t - 1) / BEAT) % 1;
              const pulse = t > 1 ? Math.max(0, 1 - ph * 3) : 0;
              g.fillStyle = U.alpha(p.color.c, 0.1 + pulse * 0.15);
              g.fillRect(lx, HIT * h - m * 0.05, lw, m * 0.1);
              g.strokeStyle = p.color.c;
              g.lineWidth = 3;
              g.beginPath();
              g.moveTo(lx - 8, HIT * h);
              g.lineTo(lx + lw + 8, HIT * h);
              g.stroke();
              // ноти
              chart.forEach((n, i) => {
                const k = (n.t - t) / LEAD;
                if (k > 1.05 || k < -0.15) return;
                const j = s.judged[i];
                if (j != null && j !== 'miss') return;
                const y = HIT * h - k * HIT * h;
                g.fillStyle = j === 'miss' ? '#4A4468' : p.color.c;
                U.rr(g, lx + lw * 0.1, y - m * 0.025, lw * 0.8, m * 0.05, m * 0.025);
                g.fill();
                g.fillStyle = 'rgba(255,255,255,0.35)';
                g.fillRect(lx + lw * 0.18, y - m * 0.018, lw * 0.64, m * 0.012);
              });
              E.txt(g, String(s.sc), w / 2, h * 0.08, m * 0.09, '#fff', { weight: 900 });
              if (s.combo > 2) E.txt(g, '×' + s.combo, w / 2, h * 0.16, m * 0.05, p.color.l, { body: true, weight: 800 });
              if (s.msgT > 0) {
                g.globalAlpha = s.msgT / 0.5;
                E.txt(g, s.msg, w / 2, HIT * h - m * 0.12, m * 0.065, s.msgC, { stroke: 'rgba(0,0,0,0.5)' });
                g.globalAlpha = 1;
              }
            });
          }
          if (E.phase === 'play') E.timeBar(g, 1 - E.playT / END, '#B79CFF');
        },
      };
    },
  });
})();
