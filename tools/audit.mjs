// Автоаудит міні-ігор: боти грають кожну гру 3× на 2/3/4 гравців.
// Потрібен запущений сервер: npx http-server game -p 8123 -s -c-1
// Результат: docs/audit-sim.json і коротка таблиця в консолі.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.AUDIT_URL || 'http://localhost:8123/index.html';
const RUNS = +(process.env.AUDIT_RUNS || 3);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForTimeout(600);

const res = await page.evaluate((RUNS) => {
  document.body.classList.add('playing');
  window.dispatchEvent(new Event('resize'));
  const out = {};
  for (const def of G.games) {
    const row = { name: def.name, runs: [] };
    for (const n of [2, 3, 4]) {
      for (let k = 0; k < RUNS; k++) {
        const slots = ['bot', 'bot', 'bot', 'bot'].map((t, i) => (i < n ? t : 'off'));
        const E = G.E;
        E.setPlayers(slots);
        let err = null;
        try {
          E.start(def, () => {});
          E.phase = 'count';
          E.phaseT = 2.3;
          let t = 0;
          while (E.phase !== 'result' && t < 150) {
            E._step(1 / 60);
            t += 1 / 60;
          }
        } catch (e) {
          err = e.message;
        }
        row.runs.push({ n, done: E.phase === 'result', t: +E.playT.toFixed(1), draw: !E.winners || !E.winners.length || E.winners.length > 1, err });
        E.stop();
      }
    }
    out[def.id] = row;
  }
  return out;
}, RUNS);
await browser.close();

const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const table = Object.entries(res).map(([id, r]) => {
  const done = r.runs.filter((x) => x.done);
  return {
    id,
    name: r.name,
    finished: `${done.length}/${r.runs.length}`,
    median_s: done.length ? median(done.map((x) => x.t)) : null,
    draw_rate: +(r.runs.filter((x) => x.draw).length / r.runs.length).toFixed(2),
    errors: r.runs.filter((x) => x.err).map((x) => x.err),
  };
});
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'audit-sim.json'), JSON.stringify({ table, pageErrors: errors }, null, 2));
console.table(table.map(({ errors: e, ...rest }) => ({ ...rest, errors: e.length })));
if (errors.length) console.log('page errors:', errors);
