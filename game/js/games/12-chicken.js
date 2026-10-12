(function () {
  const { U } = G;
  const TAU = U.TAU;
  G.game({
    id: 'chicken', name: 'Курча на рейках', icon: '🐔', tag: 'Сміливість', bg: '#1D2318', btn: 'ТРИМАЙ', lanes: true,
    desc: 'Затисніть кнопку — курча стоїть на рейках. Відпустіть — зістрибне. Потяг то пришвидшується, то сповільнюється. Хто зістрибне найпізніше й не потрапить під потяг — переможець.',
    create(E) {
      const CY = 0.8; // де стоїть курча (частка висоти)
      const TL = 0.32; // довжина потяга
      // спільний для всіх розклад руху потяга
      const prof = [];
      let pos = -TL - 0.05, v = U.rand(0.05, 0.1), t = 0;
      const events = [];
      for (let i = 0; i < 4; i++) events.push({ at: U.rand(0.8, 7), dv: U.rand(-0.06, 0.18) });
      while (pos < CY + 0.4 && t < 25) {
        t += 1 / 60;
        v += 0.022 / 60;
        for (const e of events)
          if (!e.done && t >= e.at) {
            e.done = true;
            v = Math.max(0.03, v + e.dv);
          }
        pos += v / 60;
        prof.push(pos);
      }
      const S = {};
      let trainY = prof[0], passed = false, toot = 0;
      function trainAt(time) {
        const i = Math.min(prof.length - 1, Math.floor(time * 60));
        return i < prof.length ? prof[i] : prof[prof.length - 1] + (time * 60 - i) * 0.01;
      }
      return {
        init() {
          for (const p of E.players) {
            S[p.id] = { st: 'on', gap: null, thr: U.rand(0.28, 0.75) * U.lerp(1.4, 0.75, E.skill), side: Math.random() < 0.5 ? -1 : 1, jumpT: 0 };
          }
        },
        start() {
          // хто не тримає кнопку на старті — вже зістрибнув
          for (const p of E.players) if (!E.down[p.id] && !p.bot) S[p.id].grace = 0.8;
        },
        update(dt) {
          const ty = trainAt(E.playT);
          trainY = ty;
          toot -= dt;
          if (toot <= 0 && ty > -0.1) {
            G.sfx('train');
            toot = U.rand(1.5, 3);
          }
          const front = ty + TL;
          for (const p of E.players) {
            const s = S[p.id];
            if (s.st === 'off') s.jumpT += dt;
            if (s.st !== 'on') continue;
            if (s.grace != null) {
              s.grace -= dt;
              if (E.down[p.id]) s.grace = null;
              else if (s.grace <= 0) this.jump(p);
              continue;
            }
            if (front >= CY - 0.02) {
              s.st = 'hit';
              E.burst(p.panel.x + p.panel.w / 2, p.panel.y + (p.rot ? (1 - CY) : CY) * p.panel.h, ['#fff', '#FFE7A3', '#FFC530'], 30);
              G.sfx('hit');
              E.eliminate(p.id);
            }
          }
          const nobodyOn = E.players.every((p) => S[p.id].st !== 'on');
          if ((front > CY + 0.25 || (nobodyOn && E.playT > 1)) && !passed) {
            passed = true;
            const d = {};
            for (const p of E.players) if (S[p.id].st === 'off') d[p.id] = S[p.id].gap;
            const w = E.best(d, 'min', 1e-6);
            E.finish(w, w.length ? `Зістрибнув за ${Math.round(S[w[0]].gap * 100)} см до потяга` : 'Потяг нікого не пожалів');
          }
        },
        jump(p) {
          const s = S[p.id];
          if (s.st !== 'on') return;
          s.st = 'off';
          s.gap = Math.max(0, CY - 0.02 - (trainY + TL));
          G.sfx('jump');
        },
        bot(p) {
          const s = S[p.id];
          if (s.st !== 'on') return;
          if (!E.down[p.id]) {
            E.hold(p.id, true);
            return;
          }
          const i = Math.min(prof.length - 1, Math.floor(E.playT * 60));
          const vNow = i > 0 ? (prof[i] - prof[i - 1]) * 60 : 0.05;
          const ttc = (CY - 0.02 - (trainY + TL)) / Math.max(0.01, vNow);
          if (ttc < s.thr) E.hold(p.id, false);
        },
        release(p) {
          if (S[p.id].grace == null) this.jump(p);
        },
        label(p) {
          const s = S[p.id];
          return s.st === 'off' ? 'ЗІСТРИБНУВ' : s.st === 'hit' ? 'БАЦ!' : null;
        },
        draw(g) {
          for (const p of E.players) {
            const s = S[p.id];
            E.panel(g, p, (w, h) => {
              const m = Math.min(w, h);
              g.fillStyle = '#26301F';
              g.fillRect(0, 0, w, h);
              // шпали й рейки
              const rw = Math.min(w * 0.36, m * 0.42);
              for (let y = -((E.t * 0) % 1); y < h; y += h * 0.06) {
                g.fillStyle = '#5A4330';
                g.fillRect(w / 2 - rw * 0.65, y, rw * 1.3, h * 0.025);
              }
              g.fillStyle = '#A9B1C4';
              g.fillRect(w / 2 - rw / 2 - 2, 0, 4, h);
              g.fillRect(w / 2 + rw / 2 - 2, 0, 4, h);
              // курча
              let cx = w / 2, cy = CY * h;
              if (s.st === 'off') {
                const k = Math.min(1, s.jumpT / 0.3);
                cx += s.side * (rw * 0.9 + w * 0.08) * k;
                cy -= Math.sin(k * Math.PI) * m * 0.08;
              }
              if (s.st !== 'hit') {
                g.fillStyle = 'rgba(0,0,0,0.25)';
                g.beginPath();
                g.ellipse(cx, CY * h + m * 0.05, m * 0.06, m * 0.02, 0, 0, TAU);
                g.fill();
                E.emoji(g, '🐔', cx, cy, m * 0.13);
                g.strokeStyle = p.color.c;
                g.lineWidth = 3;
                g.beginPath();
                g.arc(cx, cy, m * 0.09, 0, TAU);
                g.stroke();
              }
              // потяг
              const ty = trainY * h, th = TL * h;
              if (ty + th > 0) {
                const tw = rw * 1.25;
                g.fillStyle = '#3B3350';
                U.rr(g, w / 2 - tw / 2, ty, tw, th, tw * 0.15);
                g.fill();
                g.fillStyle = '#FF5468';
                U.rr(g, w / 2 - tw / 2, ty + th - tw * 0.6, tw, tw * 0.6, tw * 0.2);
                g.fill();
                g.fillStyle = '#FFF4C2';
                g.beginPath();
                g.arc(w / 2, ty + th - tw * 0.18, tw * 0.12, 0, TAU);
                g.fill();
                g.fillStyle = 'rgba(255,244,194,0.12)';
                g.beginPath();
                g.moveTo(w / 2 - tw * 0.1, ty + th);
                g.lineTo(w / 2 - tw * 0.5, ty + th + h * 0.18);
                g.lineTo(w / 2 + tw * 0.5, ty + th + h * 0.18);
                g.lineTo(w / 2 + tw * 0.1, ty + th);
                g.fill();
                g.fillStyle = 'rgba(20,16,40,0.6)';
                for (let k = 0; k < 3; k++) g.fillRect(w / 2 - tw * 0.32, ty + th * 0.1 + k * th * 0.18, tw * 0.64, th * 0.1);
              }
              if (s.st === 'hit') E.outPanel(g, w, h, 'ПІД ПОТЯГОМ');
              if (s.st === 'off' && s.gap != null) E.txt(g, Math.round(s.gap * 100) + ' см', w / 2, h * 0.93, m * 0.07, '#fff', { stroke: 'rgba(0,0,0,0.5)' });
              if (E.phase === 'play' && s.grace != null) E.txt(g, 'ЗАТИСНИ!', w / 2, h * 0.5, m * 0.1, '#FFC530', { stroke: 'rgba(0,0,0,0.5)' });
            });
          }
        },
      };
    },
  });
})();
