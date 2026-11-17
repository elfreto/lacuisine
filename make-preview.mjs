// Transforme dist-preview/index.html en fragment publiable (sans doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-preview/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover" />\n<title>');
const title = keep.match(/<title>.*?<\/title>/)[0];
writeFileSync(process.argv[2], `${title}\n${keep.replace(title, '')}\n${body}\n`);
