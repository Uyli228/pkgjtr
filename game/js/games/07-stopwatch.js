(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'stopwatch', name: 'Секундомір', icon: '⏱️', tag: 'Відчуття часу', bg: '#151230', btn: 'ТРИМАЙ', lanes: true,
    verb: 'РАХУЙ ПОДУМКИ', desc: 'Затисни й відпусти рівно через указану кількість секунд. Таймер ховається через 1,5 с.',
    create(E) {
      const SHOW = 1.5, LIMIT = 10;
      const T = U.pick([4, 5, 6, 7, 8]);
      const S = {};
      let reveal = -1;
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { st: 'wait', t0: 0, dur: 0, botStart: U.rand(0.3, 1.8), botDur: Math.max(0.5, T + U.gauss() * U.lerp(0.6, 0.12, E.skill)) };
          }
        },
        update(dt) {
          if (reveal >= 0) {
            reveal += dt;
            if (reveal > 1.6) {
              const d = {};
              for (const p of E.players) if (S[p.id].st === 'done') d[p.id] = Math.round(Math.abs(S[p.id].dur - T) * 1000);
              const w = E.best(d, 'min');
              E.finish(w, w.length ? `Ціль ${T}.00 с · ${S[w[0]].dur.toFixed(2)} с` : 'Ніхто не впорався');
            }
            return;
          }
          for (const p of E.players) {
            const s = S[p.id];
            if (s.st === 'wait' && E.playT > LIMIT) s.st = 'miss';
            if (s.st === 'hold' && E.playT - s.t0 > T * 2.5) {
              s.st = 'done';
              s.dur = E.playT - s.t0;
            }
          }
          if (E.players.every((p) => S[p.id].st === 'done' || S[p.id].st === 'miss')) {
            reveal = 0;
            G.sfx('alarm');
          }
        },
        bot(p) {
          const s = S[p.id];
          if (s.st === 'wait' && E.playT >= s.botStart) E.press(p.id);
          else if (s.st === 'hold' && E.playT - s.t0 >= s.botDur) E.release(p.id);
        },
        press(p) {
          const s = S[p.id];
          if (s.st !== 'wait' || reveal >= 0) return;
          s.st = 'hold';
          s.t0 = E.playT;
          G.sfx('beep');
        },
        release(p) {
          const s = S[p.id];
          if (s.st !== 'hold') return;
          s.st = 'done';
          s.dur = E.playT - s.t0;
          G.sfx('stick');
        },
        label(p) {
          const s = S[p.id];
          return s.st === 'hold' ? 'ВІДПУСТИ…' : s.st === 'done' ? 'ГОТОВО' : s.st === 'miss' ? 'ПРОҐАВ' : 'ЗАТИСНИ';
        },
        draw(g) {
          const fin = reveal >= 0 || E.phase === 'result' || E.phase === 'done';
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h * 0.8);
              g.fillStyle = '#151230';
              g.fillRect(0, 0, w, h);
              E.txt(g, `ЦІЛЬ: ${T} СЕКУНД`, w / 2, h * 0.1, m * 0.075, p.color.l, { weight: 800 });
              const cx = w / 2, cy = h * 0.52, R = m * 0.3;
              g.beginPath();
              g.arc(cx, cy, R, 0, TAU);
              g.fillStyle = '#0E0B1F';
              g.fill();
              g.lineWidth = m * 0.025;
              g.strokeStyle = p.color.c;
              g.stroke();
              for (let i = 0; i < 12; i++) {
                const a = (i / 12) * TAU;
                g.strokeStyle = 'rgba(255,255,255,0.3)';
                g.lineWidth = 2;
                g.beginPath();
                g.moveTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8);
                g.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
                g.stroke();
              }
              let el = 0;
              if (s.st === 'hold') el = E.playT - s.t0;
              else if (s.st === 'done') el = s.dur;
              const hidden = !fin && ((s.st === 'hold' && el > SHOW) || s.st === 'done');
              if (!hidden) {
                const a = -Math.PI / 2 + (el / T) * TAU;
                g.strokeStyle = '#fff';
                g.lineWidth = m * 0.02;
                g.lineCap = 'round';
                g.beginPath();
                g.moveTo(cx, cy);
                g.lineTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
                g.stroke();
                g.lineCap = 'butt';
              }
              let big = s.st === 'wait' ? '0.00' : el.toFixed(2);
              let col = '#fff';
              if (hidden) {
                big = s.st === 'done' ? '✓' : '???';
                col = s.st === 'done' ? p.color.c : 'rgba(255,255,255,0.5)';
              }
              if (s.st === 'miss') {
                big = '—';
                col = '#8D86B0';
              }
              E.txt(g, big, cx, cy, m * (big.length > 3 ? 0.11 : 0.14), col, { weight: 900, stroke: '#0E0B1F' });
              if (fin && s.st === 'done') {
                const d = s.dur - T;
                E.txt(g, (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2) + ' с', cx, cy + R + m * 0.1, m * 0.075, Math.abs(d) < 0.25 ? '#35D486' : '#FFC530');
              } else if (s.st === 'hold' && el <= SHOW) {
                E.txt(g, 'рахуйте…', cx, cy + R + m * 0.1, m * 0.06, 'rgba(255,255,255,0.6)', { body: true, weight: 700 });
              }
            });
          }
        },
      };
    },
  });
})();
