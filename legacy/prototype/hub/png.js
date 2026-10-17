/* Tiny PNG reader (RGBA) for the walkable-mask check. Node tests only. */
var zlib = require('zlib');

function readPng(path) {
  var fs = require('fs');
  var data = fs.readFileSync(path);
  if (data.slice(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') throw new Error('not a png: ' + path);
  var i = 8, w, h, color, idat = [];
  while (i < data.length) {
    var len = data.readUInt32BE(i);
    var typ = data.slice(i + 4, i + 8).toString('ascii');
    var chunk = data.slice(i + 8, i + 8 + len);
    if (typ === 'IHDR') {
      w = chunk.readUInt32BE(0);
      h = chunk.readUInt32BE(4);
      color = chunk[9];
    } else if (typ === 'IDAT') idat.push(chunk);
    else if (typ === 'IEND') break;
    i += 12 + len;
  }
  if (color !== 6) throw new Error('expected RGBA png');
  var raw = zlib.inflateSync(Buffer.concat(idat));
  var bpp = 4, stride = w * bpp, pos = 0, prev = Buffer.alloc(stride), rows = [];
  for (var y = 0; y < h; y++) {
    var filt = raw[pos++];
    var row = Buffer.from(raw.slice(pos, pos + stride));
    pos += stride;
    for (var x = 0; x < row.length; x++) {
      var left = x >= bpp ? row[x - bpp] : 0;
      var up = prev[x];
      var ul = x >= bpp ? prev[x - bpp] : 0;
      if (filt === 1) row[x] = (row[x] + left) & 255;
      else if (filt === 2) row[x] = (row[x] + up) & 255;
      else if (filt === 3) row[x] = (row[x] + ((left + up) >> 1)) & 255;
      else if (filt === 4) {
        var p = left + up - ul;
        var pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        var pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : ul);
        row[x] = (row[x] + pr) & 255;
      } else if (filt !== 0) throw new Error('bad filter ' + filt);
    }
    rows.push(row);
    prev = row;
  }
  return { w: w, h: h, rows: rows };
}

module.exports = { readPng: readPng };
