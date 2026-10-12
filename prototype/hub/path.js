/* Grid pathfinding for the apartment hub. 4-direction A* over a walkable mask.
 * Walkable cells are JSON true or 1. No DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HubPath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DIRS = [
    { c: 0, r: -1, face: 'up' },
    { c: 1, r: 0, face: 'right' },
    { c: 0, r: 1, face: 'down' },
    { c: -1, r: 0, face: 'left' }
  ];

  function isWalkable(grid, c, r) {
    if (!grid || r < 0 || c < 0 || r >= grid.length || !grid[r] || c >= grid[r].length) return false;
    var v = grid[r][c];
    return v === true || v === 1;
  }

  function coord(p) {
    return {
      c: (p.c != null ? p.c : p.col) | 0,
      r: (p.r != null ? p.r : p.row) | 0
    };
  }

  function findPath(grid, start, goal) {
    start = coord(start);
    goal = coord(goal);
    var sc = start.c, sr = start.r, gc = goal.c, gr = goal.r;
    if (!isWalkable(grid, sc, sr) || !isWalkable(grid, gc, gr)) return null;
    if (sc === gc && sr === gr) return [{ c: sc, r: sr }];
    var cols = grid[0].length;
    var key = function (c, r) { return r * cols + c; };
    var heur = function (c, r) { return Math.abs(c - gc) + Math.abs(r - gr); };
    var open = [{ c: sc, r: sr, g: 0, f: heur(sc, sr) }];
    var came = new Map();
    var best = new Map([[key(sc, sr), 0]]);
    var seen = new Set();
    while (open.length) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) {
        var a = open[i], b = open[bi];
        if (a.f < b.f || (a.f === b.f && (a.g < b.g || (a.g === b.g && (a.r < b.r || (a.r === b.r && a.c < b.c)))))) bi = i;
      }
      var cur = open.splice(bi, 1)[0];
      var ck = key(cur.c, cur.r);
      if (seen.has(ck)) continue;
      seen.add(ck);
      if (cur.c === gc && cur.r === gr) {
        var path = [{ c: gc, r: gr }];
        var k = ck;
        while (came.has(k)) {
          k = came.get(k);
          path.push({ c: k % cols, r: (k / cols) | 0 });
        }
        path.reverse();
        return path;
      }
      for (var d = 0; d < DIRS.length; d++) {
        var nc = cur.c + DIRS[d].c, nr = cur.r + DIRS[d].r;
        if (!isWalkable(grid, nc, nr)) continue;
        var nk = key(nc, nr);
        if (seen.has(nk)) continue;
        var ng = cur.g + 1;
        if (ng >= (best.has(nk) ? best.get(nk) : Infinity)) continue;
        best.set(nk, ng);
        came.set(nk, ck);
        open.push({ c: nc, r: nr, g: ng, f: ng + heur(nc, nr) });
      }
    }
    return null;
  }

  function facingBetween(a, b) {
    if (b.c > a.c) return 'right';
    if (b.c < a.c) return 'left';
    if (b.r > a.r) return 'down';
    if (b.r < a.r) return 'up';
    return null;
  }

  /* First listed approach wins ties, so room.json order is the art direction. */
  function pickApproach(grid, start, approaches) {
    var best = null;
    for (var i = 0; i < approaches.length; i++) {
      var spot = approaches[i];
      var goal = coord(spot);
      var path = findPath(grid, start, goal);
      if (!path) continue;
      if (!best || path.length < best.path.length) {
        best = { c: goal.c, r: goal.r, face: spot.face, path: path };
      }
    }
    return best;
  }

  return { DIRS: DIRS, isWalkable: isWalkable, findPath: findPath, facingBetween: facingBetween, pickApproach: pickApproach };
});
