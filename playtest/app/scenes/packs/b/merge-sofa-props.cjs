'use strict';

const fs = require('node:fs');
const path = require('node:path');

function mergeSofaProps(pack, packDir, sofaPath = path.join(__dirname, '../sofa/manifest.json')) {
  const sofa = JSON.parse(fs.readFileSync(sofaPath, 'utf8'));
  const root = path.resolve(path.dirname(sofaPath), sofa.assetRoot || '.');
  const kitchenDir = path.join(packDir, 'kitchen');
  fs.mkdirSync(kitchenDir, { recursive: true });

  function copyDrawable(drawable) {
    if (!drawable || drawable.source !== 'file') return;
    const source = path.join(root, drawable.file);
    const png = fs.readFileSync(source);
    // Sofa's PNG props omit dimensions; record native IHDR sizes for placement.
    if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error(`Expected PNG kitchen asset: ${source}`);
    }
    drawable.w ??= png.readUInt32BE(16);
    drawable.h ??= png.readUInt32BE(20);
    const file = path.basename(drawable.file);
    fs.copyFileSync(source, path.join(kitchenDir, file));
    drawable.file = `kitchen/${file}`;
  }

  for (const [id, original] of Object.entries(sofa.assets)) {
    if (!id.startsWith('prop.') && !id.startsWith('backdrop.')) continue;
    const entry = structuredClone(original);
    copyDrawable(entry);
    if (entry.type === 'backdrop') {
      copyDrawable(entry.base);
      copyDrawable(entry.tall);
    }
    pack.assets[id] = entry;
  }

  pack.aliases = {
    ...pack.aliases,
    'camille.bend': 'camille.stand',
    'camille.point': 'camille.arm_r.point',
    'noe.look.0': 'noe.stand',
    'noe.look.1': 'noe.face.brow_raise',
    'croissant.idle.alt': 'croissant.idle.1',
    'croissant.glance': 'croissant.face.brow_raise',
    'croissant.peek.0': 'croissant.sit',
    'croissant.peek.1': 'croissant.sit',
    'croissant.tail.0': 'croissant.tail_up',
    'croissant.tail.1': 'croissant.tail_up'
  };
  return pack;
}

if (require.main === module) {
  const packDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
  const manifestPath = path.join(packDir, 'manifest.json');
  const pack = mergeSofaProps(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), packDir);
  fs.writeFileSync(manifestPath, JSON.stringify(pack, null, 2) + '\n');
  console.log(`Merged kitchen props: ${Object.keys(pack.assets).length} total assets`);
}

module.exports = { mergeSofaProps };
