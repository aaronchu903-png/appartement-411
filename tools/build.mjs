// Builds dist/appartement-404.html (everything inlined, opens from a file) and dist/appartement-404-v<version>.zip.
// No dependencies. Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>\n' + fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
if (/(src|href)="(?!data:|#)[^"]+"/.test(html.replace(/<a [^>]*>/g, ''))) throw new Error('external reference left in single-file build');
html = html.replace('<head>', '<head>\n<!-- Appartement 404 v' + pkg.version + ' single-file build ' + new Date().toISOString() + ' -->');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'appartement-404.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB');
const zip = path.join(ROOT, 'dist', 'appartement-404-v' + pkg.version + '.zip');
const files = ['index.html', 'css', 'js', 'docs', 'tests', 'tools', 'package.json', 'package-lock.json', 'README.md', 'dist/appartement-404.html', 'evidence'];
execFileSync('python3', ['-c', `
import zipfile, os, sys
root, out, items = sys.argv[1], sys.argv[2], sys.argv[3:]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for it in items:
        p = os.path.join(root, it)
        if os.path.isfile(p): z.write(p, 'appartement-404/' + it)
        elif os.path.isdir(p):
            for d, _, fs in os.walk(p):
                for f in sorted(fs): fp = os.path.join(d, f); z.write(fp, 'appartement-404/' + os.path.relpath(fp, root))
`, ROOT, zip, ...files]);
console.log('wrote', zip, (fs.statSync(zip).size / 1024).toFixed(1) + ' KB');
