// Builds dist/appartement-411.html (everything inlined, opens from a file) and dist/appartement-411-v<version>.zip.
// No dependencies. Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n</style>');
function dataPng(rel) { return 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, rel)).toString('base64'); }
html = html.replace(/<link rel="icon" href="([^"]+)"([^>]*)>/, (_, f, rest) => '<link rel="icon" href="' + dataPng(f) + '"' + rest + '>');
html = html.replace(/<link rel="apple-touch-icon" href="([^"]+)"([^>]*)>/, (_, f, rest) => '<link rel="apple-touch-icon" href="' + dataPng(f) + '"' + rest + '>');
html = html.replace(/<link rel="manifest" href="manifest.json">/, () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  for (const ic of man.icons || []) ic.src = dataPng(ic.src);
  return '<link rel="manifest" href="data:application/manifest+json;base64,' + Buffer.from(JSON.stringify(man)).toString('base64') + '">';
});
// v0.1.3: the Day 1 recordings (audio/d1/*.mp3) are inlined as base64 data URIs so the single file works offline.
function inlineClips() {
  const CL = require('../js/clips.js');
  const files = {};
  for (const id of CL.ids) files[id] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(ROOT, 'audio', 'd1', id + '.mp3')).toString('base64');
  return '\n;(function () { window.A411.CLIPS.files = ' + JSON.stringify(files) + '; })();';
}
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>\n' + (fs.readFileSync(path.join(ROOT, f), 'utf8') + (f === 'js/clips.js' ? inlineClips() : '')).replace(/<\/script/gi, '<\\/script') + '\n</script>');
if (/(src|href)="(?!data:|#)[^"]+"/.test(html.replace(/<a [^>]*>/g, ''))) throw new Error('external reference left in single-file build');
html = html.replace('<head>', '<head>\n<!-- L’Appartement 411 v' + pkg.version + ' single-file build ' + new Date().toISOString() + ' -->');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'appartement-411.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB');
const zip = path.join(ROOT, 'dist', 'appartement-411-v' + pkg.version + '.zip');
const files = ['index.html', 'css', 'js', 'audio', 'docs', 'tests', 'tools', 'icons', 'manifest.json', 'package.json', 'package-lock.json', 'README.md', 'dist/appartement-411.html', 'evidence'];
execFileSync('python3', ['-c', `
import zipfile, os, sys
root, out, items = sys.argv[1], sys.argv[2], sys.argv[3:]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for it in items:
        p = os.path.join(root, it)
        if os.path.isfile(p): z.write(p, 'appartement-411/' + it)
        elif os.path.isdir(p):
            for d, _, fs in os.walk(p):
                for f in sorted(fs): fp = os.path.join(d, f); z.write(fp, 'appartement-411/' + os.path.relpath(fp, root))
`, ROOT, zip, ...files]);
console.log('wrote', zip, (fs.statSync(zip).size / 1024).toFixed(1) + ' KB');
