'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Tap = require('../js/tap-guide.js');
const Day10 = require('../js/day10.js');

function mem() {
  var box = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(box, k) ? box[k] : null; },
    setItem: function (k, v) { box[k] = String(v); }
  };
}

test('the hand taps twice on the first walk, then stays stored on that profile', function () {
  var ls = mem();
  var s = Tap.session({ storage: ls, profileId: 'jinyi', idleMs: 5000 });
  s.begin(1000);
  assert.equal(s.frame(1000).hand, 'up');
  assert.equal(s.frame(1000 + 200).hand, 'down');
  assert.equal(s.frame(1000 + 400).hand, 'up');
  assert.equal(s.frame(1000 + 700).hand, 'down');
  assert.equal(s.frame(1000 + Tap.HAND_DONE).hand, 'done');
  assert.equal(ls.getItem('a411.p.jinyi.tapHand'), '1');
  var again = Tap.session({ storage: ls, profileId: 'jinyi', idleMs: 5000 });
  again.begin(0);
  assert.equal(again.frame(200).hand, 'off');
  assert.equal(again.frame(200).glow, true);
  var other = Tap.session({ storage: ls, profileId: 'yuechao', idleMs: 5000 });
  other.begin(0);
  assert.equal(other.frame(100).hand, 'up');
  assert.equal(other.frame(200).hand, 'down');
});

test('the cat waits out the idle, and a poke restarts that wait', function () {
  var s = Tap.session({ storage: mem(), profileId: 'jinyi' });
  assert.equal(s.idleMs, Tap.IDLE_MS);
  assert.equal(Tap.IDLE_MS, 5000);
  s.begin(0);
  assert.equal(s.frame(4999).cat, 'wait');
  assert.equal(s.frame(5000).cat, 'go');
  var poked = Tap.session({ storage: mem(), profileId: 'jinyi', idleMs: 5000 });
  poked.begin(0);
  poked.poke(4000);
  assert.equal(poked.frame(8999).cat, 'wait');
  assert.equal(poked.frame(9000).cat, 'go');
  assert.equal(poked.frame(9000).glow, true);
});

test('a hidden target gets no hand, no glow and no cat', function () {
  var ls = mem();
  var s = Tap.session({ storage: ls, profileId: 'jinyi', hidden: true, idleMs: 0 });
  s.begin(0);
  var fr = s.frame(5000);
  assert.equal(fr.hand, 'off');
  assert.equal(fr.glow, false);
  assert.equal(fr.cat, 'wait');
  assert.equal(ls.getItem('a411.p.jinyi.tapHand'), null);
});

test('only the three open Day 10 goals may take the pointer', function () {
  Object.keys(Day10.HUB.meta).forEach(function (id) {
    var meta = Day10.HUB.meta[id];
    assert.equal(Tap.allows(id), !!meta.goal, id);
  });
  assert.equal(Tap.allows('d9_D'), false);
  assert.equal(Tap.allows('d8_B'), false);
  assert.equal(Tap.allows('door_lefevre'), false);
});

test('floor taps snap to a walkable cell and the cat looks back at the player', function () {
  var grid = [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 1]
  ];
  assert.deepEqual(Tap.nearestWalkable(grid, 2, 0, 4), { c: 1, r: 0 });
  assert.deepEqual(Tap.nearestWalkable(grid, 0, 2, 4), { c: 0, r: 0 });
  var path = Tap.findPath(grid, { c: 0, r: 0 }, { c: 2, r: 2 });
  assert.deepEqual(path, [
    { c: 0, r: 0 },
    { c: 1, r: 0 },
    { c: 1, r: 1 },
    { c: 2, r: 1 },
    { c: 2, r: 2 }
  ]);
  var right = Tap.catRoute(grid, { c: 0, r: 0 }, { c: 2, r: 2 }, { c: 3, r: 2 });
  assert.equal(right.look, 'right');
  assert.equal(right.path[right.path.length - 1].c, 2);
  var left = Tap.catRoute(grid, { c: 2, r: 2 }, { c: 0, r: 0 }, { c: -1, r: 0 });
  assert.equal(left.look, 'left');
  var down = Tap.catRoute(grid, { c: 2, r: 2 }, { c: 0, r: 0 }, { c: 0, r: 2 });
  assert.equal(down.look, 'down');
});
