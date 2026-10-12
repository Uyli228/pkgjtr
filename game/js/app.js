/* Чотири Кути — меню, турнір, статистика, налаштування. */
(function () {
  'use strict';
  const { E, U } = G;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const TYPES = ['human', 'bot', 'off'];
  const TYPE_UA = { human: 'Гравець', bot: 'Бот', off: 'Не грає' };
  const byId = (id) => G.games.find((d) => d.id === id);

  const app = {
    slots: G.store.get('slots', ['human', 'human', 'off', 'off']),
    target: G.store.get('target', 5),
    pool: G.store.get('pool', null),
    tour: null,
    current: null, // поточна гра
    onEnd: null,
    returnTo: 'games',
  };
  if (!Array.isArray(app.slots) || app.slots.length !== 4) app.slots = ['human', 'human', 'off', 'off'];
  if (!Array.isArray(app.pool)) app.pool = G.games.map((d) => d.id);
  app.pool = app.pool.filter((id) => byId(id));
  // нові ігри після оновлення автоматично потрапляють у турнір
  const known = G.store.get('known', null);
  if (Array.isArray(known)) G.games.forEach((d) => { if (!known.includes(d.id) && !app.pool.includes(d.id)) app.pool.push(d.id); });
  G.store.set('known', G.games.map((d) => d.id));
  G.store.set('pool', app.pool);

  // ---------- статистика ----------
  const blankStats = () => ({ games: 0, tours: 0, wins: [0, 0, 0, 0], twins: [0, 0, 0, 0], byGame: {} });
  let stats = Object.assign(blankStats(), G.store.get('stats', {}));
  const saveStats = () => G.store.set('stats', stats);
  function recordGame(def, winners) {
    stats.games++;
    stats.byGame[def.id] = (stats.byGame[def.id] || 0) + 1;
    if (winners.length && winners.length < E.n) winners.forEach((id) => stats.wins[id]++);
    saveStats();
  }

  // ---------- навігація ----------
  function show(id) {
    $$('.screen').forEach((s) => (s.hidden = s.id !== id));
    document.body.dataset.screen = id;
    const scr = document.getElementById(id);
    if (scr) scr.scrollTop = 0;
    if (id !== 'home' && history.state !== 'sub') {
      try { history.pushState('sub', ''); } catch (e) { /* ок */ }
    }
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2400);
  }
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { G.sfx('ui'); show(b.dataset.go); }));

  // ---------- вибір гравців ----------
  function activeCount() {
    return app.slots.filter((t) => t !== 'off').length;
  }
  function validSlots() {
    return activeCount() >= 2 && app.slots.includes('human');
  }
  function renderSlots() {
    const box = $('#slots');
    box.innerHTML = '';
    app.slots.forEach((t, i) => {
      const c = G.COLORS[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.t = t;
      b.style.setProperty('--c', c.c);
      b.style.setProperty('--cd', c.d);
      b.innerHTML = `<span class="dot">${i + 1}</span><span class="who"><b>${c.name}</b><span>${TYPE_UA[t]}</span></span>`;
      b.setAttribute('aria-label', `${c.name}: ${TYPE_UA[t]}`);
      b.addEventListener('click', () => {
        app.slots[i] = TYPES[(TYPES.indexOf(t) + 1) % 3];
        G.sfx('ui');
        saveSlots();
      });
      box.appendChild(b);
    });
    const humans = app.slots.filter((t) => t === 'human').length;
    $$('.count').forEach((b) => b.classList.toggle('on', +b.dataset.n === humans));
    $('#slot-warn').hidden = validSlots();
  }
  function saveSlots() {
    G.store.set('slots', app.slots);
    renderSlots();
  }
  $$('.count').forEach((b) =>
    b.addEventListener('click', () => {
      const n = +b.dataset.n;
      app.slots = [0, 1, 2, 3].map((i) => (i < n ? 'human' : 'off'));
      if (n === 1) app.slots[1] = 'bot';
      G.sfx('ui');
      saveSlots();
    })
  );
  function playersLabel() {
    const h = app.slots.filter((t) => t === 'human').length, b = app.slots.filter((t) => t === 'bot').length;
    return `${h} ${h === 1 ? 'гравець' : 'гравці'}${b ? ` + ${b} ${b === 1 ? 'бот' : 'боти'}` : ''}`;
  }
  function requirePlayers() {
    if (validSlots()) return true;
    toast('Додайте ще гравця або бота');
    $('#slot-warn').hidden = false;
    return false;
  }

  // ---------- сітка ігор ----------
  const TILE = (d) => U.shade(d.bg || '#1D1740', 0.08);
  function renderGrid() {
    const grid = $('#grid');
    grid.innerHTML = '';
    G.games.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.style.setProperty('--tile', TILE(d));
      b.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span><span class="icon">${d.icon}</span><span class="name">${d.name}</span><span class="tag">${d.tag}</span>`;
      b.addEventListener('click', () => {
        G.sfx('ui');
        playFree(d);
      });
      grid.appendChild(b);
    });
  }
  $('#btn-games').addEventListener('click', () => {
    G.audio.init();
    if (!requirePlayers()) return;
    G.sfx('ui');
    $('#games-players').textContent = playersLabel();
    show('games');
  });
  $('#btn-random').addEventListener('click', () => {
    G.audio.init();
    if (!requirePlayers()) return;
    app.returnTo = 'home';
    playFree(U.pick(G.games), 'home');
  });

  // ---------- запуск гри ----------
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }
  function enterFullscreen() {
    if (!G.settings.fs || document.fullscreenElement) return;
    const el = document.documentElement;
    try {
      const r = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' });
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* не підтримується */ }
  }
  function launch(def, onEnd) {
    G.audio.init();
    enterFullscreen();
    app.current = def;
    app.onEnd = onEnd;
    $('#after').hidden = true;
    $('#pause').hidden = true;
    document.body.classList.add('playing');
    $('#pause-btn').hidden = false;
    // дочекаємось, поки розміри оновляться після показу полотна
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      E.setPlayers(app.slots);
      E.start(def, (w) => {
        recordGame(def, w);
        onEnd(w);
      });
    });
    keepAwake(true);
    if (history.state !== 'game') {
      try { history.pushState('game', ''); } catch (e) { /* ок */ }
    }
  }
  function leaveGame() {
    E.stop();
    document.body.classList.remove('playing');
    $('#pause-btn').hidden = true;
    $('#pause').hidden = true;
    keepAwake(false);
  }

  function playFree(def, ret) {
    if (!requirePlayers()) return;
    app.returnTo = ret || 'games';
    app.tour = null;
    launch(def, (w) => {
      $('#after-game').textContent = def.icon + ' ' + def.name;
      $('#after-title').textContent = winLine(w);
      $('#after').hidden = false;
      $('#pause-btn').hidden = true;
    });
  }
  function winLine(w) {
    if (!w.length || w.length === E.n) return 'Нічия';
    if (w.length === 1) {
      const p = E.byId(w[0]);
      return `${p.bot ? 'Бот ' : ''}${p.name} перемагає!`;
    }
    return 'Перемогли: ' + w.map((id) => E.byId(id).name).join(', ');
  }
  $('#a-again').addEventListener('click', () => {
    G.sfx('ui');
    launch(app.current, app.onEnd);
  });
  $('#a-other').addEventListener('click', () => {
    G.sfx('ui');
    leaveGame();
    $('#after').hidden = true;
    $('#games-players').textContent = playersLabel();
    show('games');
  });
  $('#a-menu').addEventListener('click', () => {
    G.sfx('ui');
    leaveGame();
    $('#after').hidden = true;
    show('home');
  });

  // ---------- пауза ----------
  G.onPhase = (ph) => {
    $('#pause-btn').hidden = !(ph === 'intro' || ph === 'count' || ph === 'play');
  };
  function pause() {
    if (!document.body.classList.contains('playing') || !$('#after').hidden || E.phase === 'off') return;
    E.paused = true;
    $('#pause-game').textContent = app.current ? app.current.icon + ' ' + app.current.name : '';
    $('#p-quit').textContent = app.tour ? 'До табло турніру' : 'Вийти з гри';
    $('#pause').hidden = false;
  }
  $('#pause-btn').addEventListener('click', () => {
    G.sfx('ui');
    pause();
  });
  $('#p-resume').addEventListener('click', () => {
    G.sfx('ui');
    E.paused = false;
    $('#pause').hidden = true;
  });
  $('#p-restart').addEventListener('click', () => {
    G.sfx('ui');
    E.paused = false;
    launch(app.current, app.onEnd);
  });
  $('#p-quit').addEventListener('click', () => {
    G.sfx('ui');
    E.paused = false;
    leaveGame();
    if (app.tour) renderBoard();
    else show(app.returnTo === 'home' ? 'home' : 'games');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  window.addEventListener('popstate', () => {
    if (document.body.classList.contains('playing')) {
      if ($('#pause').hidden) pause();
      try { history.pushState('game', ''); } catch (e) { /* ок */ }
      return;
    }
    if (app.tour && !$('#board').hidden) return;
    show('home');
  });

  // ---------- турнір ----------
  function renderPool() {
    const box = $('#pool');
    box.innerHTML = '';
    G.games.forEach((d) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (app.pool.includes(d.id) ? ' on' : '');
      b.innerHTML = `<span class="e">${d.icon}</span>${d.name}`;
      b.setAttribute('aria-pressed', app.pool.includes(d.id));
      b.addEventListener('click', () => {
        app.pool = app.pool.includes(d.id) ? app.pool.filter((x) => x !== d.id) : [...app.pool, d.id];
        G.store.set('pool', app.pool);
        renderPool();
      });
      box.appendChild(b);
    });
    $('#pool-count').textContent = `вибрано ${app.pool.length} з ${G.games.length}`;
    $('#t-start').disabled = app.pool.length === 0;
  }
  function renderTarget() {
    $$('#seg-target button').forEach((b) => b.classList.toggle('on', +b.dataset.v === app.target));
  }
  $$('#seg-target button').forEach((b) =>
    b.addEventListener('click', () => {
      app.target = +b.dataset.v;
      G.store.set('target', app.target);
      G.sfx('ui');
      renderTarget();
    })
  );
  $('#pool-all').addEventListener('click', () => {
    app.pool = G.games.map((d) => d.id);
    G.store.set('pool', app.pool);
    renderPool();
  });
  $('#pool-none').addEventListener('click', () => {
    app.pool = [];
    G.store.set('pool', app.pool);
    renderPool();
  });
  $('#btn-tourney').addEventListener('click', () => {
    G.audio.init();
    if (!requirePlayers()) return;
    G.sfx('ui');
    renderTarget();
    renderPool();
    show('tsetup');
  });

  function nextFromQueue(t) {
    if (!t.queue.length) {
      let q = U.shuffle(t.pool);
      if (q.length > 1 && t.next && q[0] === t.next.id) q.push(q.shift());
      t.queue = q;
    }
    t.next = byId(t.queue.shift());
  }
  $('#t-start').addEventListener('click', () => {
    if (!app.pool.length) return;
    G.sfx('ui');
    const players = app.slots.map((t, id) => ({ t, id })).filter((x) => x.t !== 'off');
    app.tour = {
      target: app.target,
      pool: app.pool.slice(),
      queue: [],
      next: null,
      scores: Object.fromEntries(players.map((x) => [x.id, 0])),
      ids: players.map((x) => x.id),
      bots: Object.fromEntries(players.map((x) => [x.id, x.t === 'bot'])),
      history: [],
    };
    nextFromQueue(app.tour);
    renderBoard();
  });

  function standingsHTML(t, mark) {
    const order = t.ids.slice().sort((a, b) => t.scores[b] - t.scores[a] || a - b);
    const top = t.scores[order[0]];
    return order
      .map((id) => {
        const c = G.COLORS[id];
        const pips = Array.from({ length: t.target }, (_, i) => `<i class="${i < t.scores[id] ? 'f' : ''}"></i>`).join('');
        const lead = top > 0 && t.scores[id] === top ? ' lead' : '';
        return `<li class="${lead}" style="--c:${c.c}"><span class="dot">${id + 1}</span><span class="nm">${c.name}<small>${t.bots[id] ? 'бот' : 'гравець'}${mark === id ? ' · чемпіон' : ''}</small></span><span class="crowns" aria-label="${t.scores[id]} з ${t.target}">${pips}</span></li>`;
      })
      .join('');
  }
  function renderBoard() {
    const t = app.tour;
    document.body.classList.remove('playing');
    $('#board-title').textContent = t.history.length ? `Турнір · гра ${t.history.length + 1}` : 'Турнір';
    $('#board-target').textContent = `до ${t.target} перемог`;
    const last = t.history[t.history.length - 1];
    $('#board-last').textContent = last
      ? `«${byId(last.game).name}»: ${last.winners.length && last.winners.length < t.ids.length ? last.winners.map((id) => G.COLORS[id].name).join(' і ') + ' +1' : 'нічия, корон ніхто не отримав'}`
      : 'Усі на старті. Хто перший збере корони?';
    $('#standings').innerHTML = standingsHTML(t);
    const d = t.next;
    const card = $('#next-card');
    card.style.setProperty('--tile', TILE(d));
    card.innerHTML = `<span class="icon">${d.icon}</span><div><p class="eyebrow">Наступна гра · ${d.tag}</p><h3>${d.name}</h3><p>${d.desc}</p></div>`;
    $('#end-confirm').hidden = true;
    show('board');
  }
  $('#b-play').addEventListener('click', () => {
    G.sfx('ui');
    const t = app.tour;
    launch(t.next, (w) => {
      t.history.push({ game: t.next.id, winners: w.slice() });
      if (w.length && w.length < t.ids.length) w.forEach((id) => t.scores[id]++);
      const max = Math.max(...t.ids.map((id) => t.scores[id]));
      const leaders = t.ids.filter((id) => t.scores[id] === max);
      leaveGame();
      if (max >= t.target && leaders.length === 1) return finalScreen(leaders[0]);
      if (max >= t.target) toast('Нічия на вершині — тай-брейк!');
      nextFromQueue(t);
      renderBoard();
    });
  });
  $('#b-skip').addEventListener('click', () => {
    G.sfx('ui');
    nextFromQueue(app.tour);
    renderBoard();
  });
  $('#b-end').addEventListener('click', () => ($('#end-confirm').hidden = false));
  $('#end-no').addEventListener('click', () => ($('#end-confirm').hidden = true));
  $('#end-yes').addEventListener('click', () => {
    app.tour = null;
    show('home');
  });

  function finalScreen(champ) {
    const t = app.tour;
    const c = G.COLORS[champ];
    stats.tours++;
    stats.twins[champ]++;
    saveStats();
    $('#champ-name').textContent = (t.bots[champ] ? 'Бот ' : '') + c.name;
    $('#trophy').style.setProperty('--champ', c.c);
    $('#final-standings').innerHTML = standingsHTML(t, champ);
    $('#history').innerHTML = t.history
      .map((h, i) => {
        const d = byId(h.game);
        const won = h.winners.length && h.winners.length < t.ids.length;
        const w = won ? h.winners.map((id) => `<i style="--c:${G.COLORS[id].c}" title="${G.COLORS[id].name}"></i>`).join('') : '<em>нічия</em>';
        return `<li><span class="n">${i + 1}</span><span class="g">${d.icon} ${d.name}</span><span class="w">${w}</span></li>`;
      })
      .join('');
    G.sfx('fanfare');
    G.vibe([60, 40, 60, 40, 120]);
    show('final');
  }
  $('#f-again').addEventListener('click', () => {
    G.sfx('ui');
    app.tour = null;
    renderTarget();
    renderPool();
    show('tsetup');
  });
  $('#f-menu').addEventListener('click', () => {
    G.sfx('ui');
    app.tour = null;
    show('home');
  });

  // ---------- налаштування ----------
  function renderSettings() {
    $('#set-sound').checked = !!G.settings.sound;
    $('#set-vibe').checked = !!G.settings.vibe;
    $('#set-fs').checked = !!G.settings.fs;
    $$('#seg-bot button').forEach((b) => b.classList.toggle('on', +b.dataset.v === G.settings.bot));
    $('#reset-confirm').hidden = true;
  }
  if (G.settings.fs === undefined) G.settings.fs = matchMedia('(pointer: coarse)').matches;
  ['sound', 'vibe', 'fs'].forEach((k) =>
    $('#set-' + k).addEventListener('change', (e) => {
      G.settings[k] = e.target.checked;
      G.saveSettings();
      G.audio.init();
      G.sfx('ui');
      if (k === 'vibe' && e.target.checked) G.vibe(40);
    })
  );
  $$('#seg-bot button').forEach((b) =>
    b.addEventListener('click', () => {
      G.settings.bot = +b.dataset.v;
      G.saveSettings();
      G.sfx('ui');
      renderSettings();
    })
  );
  $('#btn-settings').addEventListener('click', () => {
    G.audio.init();
    G.sfx('ui');
    renderSettings();
    show('settings');
  });
  $('#reset-stats').addEventListener('click', () => ($('#reset-confirm').hidden = false));
  $('#reset-no').addEventListener('click', () => ($('#reset-confirm').hidden = true));
  $('#reset-yes').addEventListener('click', () => {
    stats = blankStats();
    saveStats();
    $('#reset-confirm').hidden = true;
    toast('Статистику очищено');
  });

  // ---------- статистика ----------
  $('#btn-stats').addEventListener('click', () => {
    G.sfx('ui');
    const fav = Object.entries(stats.byGame).sort((a, b) => b[1] - a[1]);
    $('#stat-tiles').innerHTML = [
      [stats.games, 'зіграно міні-ігор'],
      [stats.tours, 'завершено турнірів'],
      [Object.keys(stats.byGame).length + ' / ' + G.games.length, 'різних ігор спробувано'],
      [fav.length ? byId(fav[0][0]).icon : '—', fav.length ? 'найчастіше: ' + byId(fav[0][0]).name : 'ще немає улюбленої'],
    ]
      .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
      .join('');
    const max = Math.max(1, ...stats.wins);
    $('#stat-colors').innerHTML = G.COLORS.map(
      (c, i) => `<div class="b" style="--c:${c.c}"><span>${c.name}</span><span class="track"><span class="fill" style="width:${(stats.wins[i] / max) * 100}%"></span></span><span class="v">${stats.wins[i]}</span></div>`
    ).join('') + `<p class="note">Кубків за турніри: ${G.COLORS.map((c, i) => `${c.name.toLowerCase()} — ${stats.twins[i]}`).join(', ')}.</p>`;
    $('#stat-games').innerHTML = fav.length
      ? fav
          .slice(0, 8)
          .map(([id, n], i) => {
            const d = byId(id);
            return d ? `<li><span class="n">${i + 1}</span><span class="g">${d.icon} ${d.name}</span><span class="w"><em>${n}×</em></span></li>` : '';
          })
          .join('')
      : '<li><span class="g">Зіграйте кілька ігор — і тут з’являться ваші улюблені.</span></li>';
    show('stats');
  });

  // ---------- орієнтація ----------
  function checkRotate() {
    const coarse = matchMedia('(pointer: coarse)').matches;
    $('#rotate').hidden = !(coarse && innerWidth > innerHeight && innerHeight < 520);
  }
  window.addEventListener('resize', checkRotate);

  // ---------- встановлення (PWA) ----------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvt = e;
    $('#btn-install').hidden = false;
  });
  $('#btn-install').addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch (e) { /* ок */ }
    installEvt = null;
    $('#btn-install').hidden = true;
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ---------- старт ----------
  E.init($('#cv'));
  renderSlots();
  renderGrid();
  checkRotate();
  show('home');
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 20px Unbounded').catch(() => {});
    document.fonts.load('700 15px Manrope').catch(() => {});
  }
  G.app = app;
})();
