/* Reusable tap guide for a walkable room.
 * The hand shows once per profile. The glow and the cat point at the next
 * open target, never at a hidden mechanic. Floor taps resolve to a walkable
 * cell. No DOM required for the session, the path, or the storage flag. */
(function (root) {
  'use strict';

  var IDLE_MS = 5000;
  var HAND_DONE = 1100;
  var HAND_TAPS = [[160, 380], [620, 860]];
  var OPEN_BEATS = { d10_climb: true, d10_plant: true, d10_water: true };

  function storageKey(profileId) {
    return 'a411.p.' + profileId + '.tapHand';
  }

  function handSeen(storage, profileId) {
    if (!storage || !profileId) return false;
    try { return storage.getItem(storageKey(profileId)) === '1'; }
    catch (e) { return false; }
  }

  function markHand(storage, profileId) {
    if (!storage || !profileId) return;
    try { storage.setItem(storageKey(profileId), '1'); } catch (e) {}
  }

  function allows(beatId) {
    return !!OPEN_BEATS[beatId];
  }

  function session(opts) {
    opts = opts || {};
    var storage = opts.storage || null;
    var profileId = opts.profileId || '';
    var idleMs = opts.idleMs == null ? IDLE_MS : Number(opts.idleMs);
    var hidden = !!opts.hidden;
    var seen = hidden || handSeen(storage, profileId);
    var started = 0;
    var idleFrom = 0;
    var marked = seen;
    var catStarted = false;

    function begin(now) {
      started = now;
      idleFrom = now;
    }

    function poke(now) {
      if (!catStarted) idleFrom = now;
    }

    function frame(now) {
      var hand = 'off';
      if (!hidden && !seen) {
        var dt = now - started;
        if (dt >= HAND_DONE) {
          hand = 'done';
          if (!marked) {
            markHand(storage, profileId);
            marked = true;
            seen = true;
          }
        } else {
          hand = 'up';
          for (var i = 0; i < HAND_TAPS.length; i++) {
            if (dt >= HAND_TAPS[i][0] && dt < HAND_TAPS[i][1]) hand = 'down';
          }
        }
      }
      if (!hidden && !catStarted && (now - idleFrom) >= idleMs) catStarted = true;
      return {
        hand: hand,
        glow: !hidden,
        cat: (!hidden && catStarted) ? 'go' : 'wait'
      };
    }

    return { begin: begin, poke: poke, frame: frame, idleMs: idleMs };
  }

  function watch(sess, render) {
    var alive = true;
    var raf = root.requestAnimationFrame;
    function tick(now) {
      if (!alive) return;
      render(sess.frame(now || Date.now()));
      if (alive && raf) raf(tick);
    }
    if (raf) raf(tick);
    return {
      poke: function (now) { sess.poke(now == null ? Date.now() : now); },
      stop: function () { alive = false; }
    };
  }

  function cellWalkable(grid, c, r) {
    if (!grid || r < 0 || c < 0 || r >= grid.length || !grid[r] || c >= grid[r].length) return false;
    var v = grid[r][c];
    return v === true || v === 1;
  }

  function nearestWalkable(grid, c, r, maxRadius) {
    c = c | 0;
    r = r | 0;
    var cap = maxRadius == null ? 24 : maxRadius;
    if (cellWalkable(grid, c, r)) return { c: c, r: r };
    for (var d = 1; d <= cap; d++) {
      for (var dc = -d; dc <= d; dc++) {
        var dr = d - Math.abs(dc);
        var opts = dr === 0 ? [[dc, 0]] : [[dc, -dr], [dc, dr]];
        for (var i = 0; i < opts.length; i++) {
          var nc = c + opts[i][0];
          var nr = r + opts[i][1];
          if (cellWalkable(grid, nc, nr)) return { c: nc, r: nr };
        }
      }
    }
    return null;
  }

  function point(p) {
    return {
      c: (p.c != null ? p.c : p.col) | 0,
      r: (p.r != null ? p.r : p.row) | 0
    };
  }

  function findPath(grid, start, goal) {
    start = point(start);
    goal = point(goal);
    if (!cellWalkable(grid, start.c, start.r) || !cellWalkable(grid, goal.c, goal.r)) return null;
    if (start.c === goal.c && start.r === goal.r) return [{ c: start.c, r: start.r }];
    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    var q = [start];
    var prev = {};
    var seen = {};
    function key(c, r) { return r + ',' + c; }
    seen[key(start.c, start.r)] = 1;
    var qi = 0;
    while (qi < q.length) {
      var cur = q[qi++];
      for (var d = 0; d < dirs.length; d++) {
        var nc = cur.c + dirs[d][0];
        var nr = cur.r + dirs[d][1];
        var nk = key(nc, nr);
        if (seen[nk] || !cellWalkable(grid, nc, nr)) continue;
        seen[nk] = 1;
        prev[nk] = key(cur.c, cur.r);
        if (nc === goal.c && nr === goal.r) {
          var path = [{ c: nc, r: nr }];
          var pk = key(cur.c, cur.r);
          var guard = 0;
          while (pk && guard++ < 4096) {
            var bits = pk.split(',');
            path.push({ c: +bits[1], r: +bits[0] });
            pk = prev[pk];
          }
          path.reverse();
          return path;
        }
        q.push({ c: nc, r: nr });
      }
    }
    return null;
  }

  /* from is the cat. player is who the seated cat looks at.
   * The sit sprite faces left, so look 'right' means flip it. */
  function catRoute(grid, from, goal, player) {
    var start = nearestWalkable(grid, from.c | 0, from.r | 0, 6) || point(from);
    var dest = nearestWalkable(grid, goal.c | 0, goal.r | 0, 6) || start;
    var path = findPath(grid, start, dest) || [{ c: start.c, r: start.r }];
    var end = path[path.length - 1];
    var who = player || from;
    var pc = who.c | 0;
    var pr = who.r | 0;
    var look = pc === end.c ? (pr > end.r ? 'down' : 'up') : (pc > end.c ? 'right' : 'left');
    return { path: path, look: look };
  }

  function playSoft() {
    try {
      var Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      var ac = playSoft.ac || (playSoft.ac = new Ctx());
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = 480;
      g.gain.value = 0.012;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07);
      o.stop(ac.currentTime + 0.08);
    } catch (e) {}
  }

  function wiggle(el) {
    if (!el || !el.style) return;
    var n = 0;
    function tick() {
      n += 1;
      if (!el.isConnected || n > 4) {
        el.style.translate = '';
        return;
      }
      el.style.translate = (n % 2 ? '2px' : '-2px') + ' 0';
      setTimeout(tick, 45);
    }
    tick();
  }

  function createHand() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'tap-hand');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('aria-hidden', 'true');
    var g = document.createElementNS(ns, 'g');
    g.setAttribute('fill', '#fffdf8');
    g.setAttribute('stroke', '#2a2e3a');
    g.setAttribute('stroke-width', '1.6');
    g.setAttribute('stroke-linejoin', 'round');
    var finger = document.createElementNS(ns, 'path');
    finger.setAttribute('d', 'M19.2 2.8c-1.5 0-2.6 1.1-2.6 2.6v8.6h-.5V7.6c0-1.4-1.1-2.5-2.5-2.5s-2.5 1.1-2.5 2.5v7.6h-.5V10c0-1.4-1.1-2.5-2.5-2.5S5.6 8.6 5.6 10v8.8c0 5.2 3.9 8.6 8.8 8.6h1.6c4.4 0 7.4-3 7.4-7.2V5.4c0-1.5-1.1-2.6-2.6-2.6h-1.6z');
    g.appendChild(finger);
    svg.appendChild(g);
    return svg;
  }

  var api = {
    IDLE_MS: IDLE_MS,
    HAND_DONE: HAND_DONE,
    HAND_TAPS: HAND_TAPS,
    storageKey: storageKey,
    handSeen: handSeen,
    markHand: markHand,
    allows: allows,
    session: session,
    watch: watch,
    nearestWalkable: nearestWalkable,
    findPath: findPath,
    catRoute: catRoute,
    playSoft: playSoft,
    wiggle: wiggle,
    createHand: createHand
  };

  root.A411 = root.A411 || {};
  root.A411.TapGuide = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
