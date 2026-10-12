// Збирає гру в один HTML-файл: dist/chotyry-kuty.html
// Використання: node tools/build.mjs [--body-only <шлях>]
//   --body-only — варіант без <html>/<head>/<body> (для вбудовування в іншу сторінку)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = join(root, 'game');
let html = readFileSync(join(gameDir, 'index.html'), 'utf8');

const read = (rel) => readFileSync(join(gameDir, rel), 'utf8');
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');

// стилі
const fontUri = (rel) => 'data:font/woff2;base64,' + readFileSync(join(gameDir, rel)).toString('base64');
const inlineCss = (href) => read(href).replace(/url\(\.\.\/(fonts\/[^)]+)\)/g, (_, f) => `url(${fontUri(f)})`);
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) => `<style>\n${inlineCss(href)}</style>`);
// скрипти
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) => `<script>\n${safeScript(read(src))}</script>`);
// PWA-посилання не працюють в одному файлі — лишаємо лише іконку як data URI
const icon = 'data:image/svg+xml,' + encodeURIComponent(read('icons/icon.svg').replace(/\s+/g, ' ').trim());
html = html.replace(/<!--pwa-->[\s\S]*?<!--\/pwa-->/, `<link rel="icon" href="${icon}">`);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'chotyry-kuty.html');
writeFileSync(out, html);
console.log('→', out, Math.round(html.length / 1024) + ' КБ');

const i = process.argv.indexOf('--body-only');
if (i > 0 && process.argv[i + 1]) {
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const links = (html.match(/<link rel="(?:preconnect|stylesheet)"[^>]*>/g) || []).join('\n');
  const style = (html.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const frag = `${title}\n${links}\n${style}\n${body}`;
  writeFileSync(process.argv[i + 1], frag);
  console.log('→', process.argv[i + 1], Math.round(frag.length / 1024) + ' КБ');
}
