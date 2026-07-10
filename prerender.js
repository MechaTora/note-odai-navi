import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');

const serverEntryPath = path.join(distDir, 'server', 'entry-server.js');
const { render } = await import(serverEntryPath);

const appHtml = render();

const templatePath = path.join(distDir, 'index.html');
const template = fs.readFileSync(templatePath, 'utf-8');

const output = template.replace(
  '<div id="root"></div>',
  `<div id="root">${appHtml}</div>`
);

fs.writeFileSync(templatePath, output, 'utf-8');
console.log('Pre-render complete: dist/index.html updated.');
