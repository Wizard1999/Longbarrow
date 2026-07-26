import { readFileSync } from 'fs';
import vm from 'vm';

const FILE = process.argv[2] || '/mnt/user-data/outputs/phase1_step1.6_construction.html';
const html = readFileSync(FILE, 'utf8');
const start = html.indexOf('// === SIM CORE START');
const end = html.indexOf('// === SIM CORE END');
if (start < 0 || end < 0) { console.error('markers not found'); process.exit(1); }

// Sandbox with NO document, NO window, NO THREE, and Math.random poisoned.
const sandbox = { Math: Object.create(Math) };
sandbox.Math.random = () => { throw new Error('sim called Math.random()'); };
vm.createContext(sandbox);

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

console.log(`\ntesting: ${FILE.split('/').pop()}`);
console.log('\n[1] sim purity — evaluates with no browser globals');
try {
  vm.runInContext(html.slice(start, end), sandbox);
  check('SIM CORE evaluates standalone (no THREE/DOM deps)', true);
} catch (e) {
  check('SIM CORE evaluates standalone', false, `-> ${e.message}`);
  process.exit(1);
}

const S = sandbox;
// top-level `const` is a lexical binding, not a property on the context object,
// so constants must be read by evaluating inside the context
const constOf = (name) => vm.runInContext(name, sandbox);
const ECON = constOf('ECON');
const TICK_HZ = constOf('TICK_HZ');
const freshMap = (seed = 1337) => S.buildTestMap(S.createWorld(seed));
const run = (w, n) => { for (let i = 0; i < n; i++) S.simStep(w); };
const workersOf = (w, team) => w.units.filter(u => u.team === team && u.gather);

console.log('\n[2] determinism');
{
  const a = freshMap(1337), b = freshMap(1337), c = freshMap(9999);
  check('same seed -> identical scenery', JSON.stringify(a.scenery) === JSON.stringify(b.scenery));
  check('different seed -> different scenery', JSON.stringify(a.scenery) !== JSON.stringify(c.scenery));
  check('scenery never spawns on top of a base',
    a.scenery.every(s => a.buildings.every(bd => Math.hypot(s.x - bd.x, s.z - bd.z) >= 7)));
  check('scenery never spawns on top of a node',
    a.scenery.every(s => a.nodes.every(n => Math.hypot(s.x - n.x, s.z - n.z) >= 5)));
}

console.log('\n[3] map symmetry (§2: no spawn has an inherent advantage)');
{
  const w = freshMap();
  const rot = (o) => `${(-o.x).toFixed(3)},${(-o.z).toFixed(3)}`;
  const p = w.buildings.find(b => b.team === 'player');
  const r = w.buildings.find(b => b.team === 'rival');
  check('bases are 180-degree rotationally symmetric', rot(p) === `${r.x.toFixed(3)},${r.z.toFixed(3)}`);
  const nodeKeys = new Set(w.nodes.map(n => `${n.x.toFixed(3)},${n.z.toFixed(3)}`));
  check('every node has a rotational twin', w.nodes.every(n => nodeKeys.has(rot(n))));
  check('both teams have equal worker counts', workersOf(w, 'player').length === workersOf(w, 'rival').length);
}

console.log('\n[4] movement (unchanged from 1.2)');
{
  const w = S.createWorld(1);
  const u = S.spawnUnit(w, 'legionnaire', 'player', 0, 0);
  S.cmdMove(w, [u.id], 21, 0);
  let ticks = 0;
  while (u.target && ticks < 1000) { S.simStep(w); ticks++; }
  const expected = 21 / 4.2 * TICK_HZ + 1;   // +1: arrival detected next tick
  check(`arrives in ~${expected} ticks (got ${ticks})`, Math.abs(ticks - expected) <= 2);
  check('landed on the destination', Math.abs(u.x - 21) < 0.1 && Math.abs(u.z) < 0.1);
}

console.log('\n[5] framerate independence — tick batching changes nothing');
{
  const stateAfter = (batches) => {
    const w = freshMap(7);
    const ws = workersOf(w, 'player');
    S.cmdGather(w, ws.map(u => u.id), w.nodes[0].id);
    for (const n of batches) run(w, n);
    return JSON.stringify([w.resources.player, w.nodes.map(n => n.amount),
      ws.map(u => [u.x.toFixed(9), u.z.toFixed(9)])]);
  };
  check('600x1 tick == 120x5 ticks (identical world state)',
    stateAfter(Array(600).fill(1)) === stateAfter(Array(120).fill(5)));
}

console.log('\n[6] gather loop — one command, runs forever (set-and-forget, 8.2)');
{
  const w = freshMap();
  const ws = workersOf(w, 'player');
  const node = w.nodes.find(n => n.x < 0);
  const accepted = S.cmdGather(w, ws.map(u => u.id), node.id);
  check('all four workers accepted the order', accepted.length === 4);
  check('resources start at zero', w.resources.player === 0);

  run(w, 200);   // 10 seconds
  const at10s = w.resources.player;
  check('essence is being delivered', at10s > 0, `(got ${at10s})`);

  run(w, 1000);  // 50 more seconds, still no input
  check('still delivering a minute later with zero further input', w.resources.player > at10s * 4);
  check('every worker is still employed', ws.every(u => u.gather.state !== 'idle'));
}

console.log('\n[7] conservation — nothing created or destroyed');
{
  const w = freshMap();
  const startOnMap = S.totalResourcesRemaining(w);
  S.cmdGather(w, workersOf(w, 'player').map(u => u.id), w.nodes[0].id);
  run(w, 1500);
  const carried = workersOf(w, 'player').reduce((s, u) => s + u.gather.carrying, 0);
  const banked = w.resources.player;
  const left = S.totalResourcesRemaining(w);
  check('banked + carried + remaining == starting total',
    banked + carried + left === startOnMap,
    `\n        ${banked} + ${carried} + ${left} != ${startOnMap}`);
  check('rival gained nothing', w.resources.rival === 0);
}

console.log('\n[8] carry amounts are exact multiples (no rounding drift)');
{
  const w = freshMap();
  const u = workersOf(w, 'player')[0];
  S.cmdGather(w, [u.id], w.nodes[0].id);
  run(w, 3000);
  check('banked essence is a whole multiple of carryAmount',
    w.resources.player % ECON.carryAmount === 0, `(got ${w.resources.player})`);
}

console.log('\n[9] node depletion and automatic re-tasking');
{
  const w = freshMap();
  const target = w.nodes.find(n => n.x < 0);
  target.amount = ECON.carryAmount * 2;         // nearly dry
  const u = workersOf(w, 'player')[0];
  S.cmdGather(w, [u.id], target.id);
  run(w, 1200);
  check('the node was drained to zero', target.amount === 0);
  check('worker re-tasked itself to another node without input',
    u.gather.state !== 'idle' && u.gather.nodeId !== target.id);
  check('and is still banking essence', w.resources.player > ECON.carryAmount * 2);
}

console.log('\n[10] graceful stop when the map is exhausted');
{
  const w = freshMap();
  for (const n of w.nodes) n.amount = 0;
  w.nodes[0].amount = ECON.carryAmount;
  const u = workersOf(w, 'player')[0];
  S.cmdGather(w, [u.id], w.nodes[0].id);
  run(w, 2000);
  check('map fully exhausted', S.totalResourcesRemaining(w) === 0);
  check('last load was still delivered', w.resources.player === ECON.carryAmount);
  check('worker went idle instead of spinning', u.gather.state === 'idle');
  check('and dropped its target', u.target === null);
}

console.log('\n[11] orders interact correctly');
{
  const w = freshMap();
  const ws = workersOf(w, 'player');
  const fighters = w.units.filter(u => u.team === 'player' && !u.gather);
  S.cmdGather(w, ws.map(u => u.id), w.nodes[0].id);
  run(w, 60);
  S.cmdMove(w, [ws[0].id], 0, 0);
  check('a move order cancels gathering', ws[0].gather.state === 'idle' && ws[0].gather.nodeId === null);
  check('other workers are unaffected', ws.slice(1).every(u => u.gather.state !== 'idle'));
  check('non-workers reject gather orders', S.cmdGather(w, fighters.map(u => u.id), w.nodes[0].id).length === 0);
  check('gather on a nonexistent node is a no-op', S.cmdGather(w, ws.map(u => u.id), 999999).length === 0);
}

console.log('\n[12] workers park in their own slots, not on top of each other');
{
  const w = freshMap();
  const ws = workersOf(w, 'player');
  S.cmdGather(w, ws.map(u => u.id), w.nodes[0].id);
  let worstParked = Infinity, sawParkedPair = false;
  // sample across a full cycle rather than at one arbitrary tick
  for (let t = 0; t < 900; t++) {
    S.simStep(w);
    const parked = ws.filter(u => u.gather.state === 'gathering');
    for (let i = 0; i < parked.length; i++)
      for (let j = i + 1; j < parked.length; j++) {
        sawParkedPair = true;
        worstParked = Math.min(worstParked, Math.hypot(parked[i].x - parked[j].x, parked[i].z - parked[j].z));
      }
  }
  check('two or more workers were parked simultaneously', sawParkedPair);
  // worker radius is 0.36, so anything under ~0.72 is visible overlap
  check('parked workers never overlap', worstParked > 0.72, `(worst ${worstParked.toFixed(3)})`);
}
// NOTE: workers still pass through each other in transit. That is unit
// collision, which arrives with pathfinding — out of scope for 1.4.

console.log('\n[13] terrain and high-ground helpers');
{
  check('height query respects the floor clamp', S.terrainHeightAt(0, 0) >= constOf('TERRAIN_FLOOR') - 1e-9);
  let minH = Infinity, hi = { h: -Infinity }, lo = { h: Infinity };
  for (let x = -30; x <= 30; x += 0.7) for (let z = -30; z <= 30; z += 0.7) {
    const h = S.terrainHeightAt(x, z);
    minH = Math.min(minH, h);
    if (h > hi.h) hi = { x, z, h };
    if (h < lo.h) lo = { x, z, h };
  }
  check('no sample falls below the floor', minH >= constOf('TERRAIN_FLOOR') - 1e-9);
  check('high ground detected uphill', S.hasHighGroundOver(hi.x, hi.z, lo.x, lo.z));
  check('not detected downhill', !S.hasHighGroundOver(lo.x, lo.z, hi.x, hi.z));
}


console.log('\n[14] Command supply — cap, cost, and enforcement (1.5)');
{
  const w = freshMap();
  const base = w.buildings.find(b => b.team === 'player');
  const BT = constOf('BUILDING_TYPES'), UT = constOf('UNIT_TYPES');
  check('cap comes from Command structures', S.supplyCap(w, 'player') === BT.standard.command);
  const startUsed = S.supplyUsed(w, 'player');
  check('starting units consume supply', startUsed === 4 * UT.worker.supply + 4 * UT.legionnaire.supply);

  w.resources.player = 10000;
  const before = w.resources.player;
  check('training deducts essence', S.cmdTrain(w, base.id, 'worker').ok && w.resources.player === before - UT.worker.cost);
  check('queued units count against the cap immediately',
    S.supplyUsed(w, 'player') === startUsed + UT.worker.supply);

  // fill to the cap
  let guard = 0;
  while (S.cmdTrain(w, base.id, 'worker').ok && guard++ < 50) {}
  check('training is refused at the cap', S.cmdTrain(w, base.id, 'worker').reason === 'not enough Command');
  check('never exceeds the cap', S.supplyUsed(w, 'player') <= S.supplyCap(w, 'player'));
}

console.log('\n[15] production queue');
{
  const w = freshMap();
  const base = w.buildings.find(b => b.team === 'player');
  const UT = constOf('UNIT_TYPES'), MAX_QUEUE = constOf('MAX_QUEUE');
  w.resources.player = 10000;
  const unitsBefore = w.units.length;
  S.cmdTrain(w, base.id, 'worker');
  run(w, UT.worker.buildTicks - 1);
  check('unit has not appeared early', w.units.length === unitsBefore);
  run(w, 1);
  check('unit appears on schedule', w.units.length === unitsBefore + 1);
  const fresh = w.units[w.units.length - 1];
  check('spawns on the correct team', fresh.team === 'player');
  check('walks to the rally point', fresh.target !== null);

  for (let i = 0; i < MAX_QUEUE + 3; i++) S.cmdTrain(w, base.id, 'worker');
  check('queue depth is capped', base.queue.length <= MAX_QUEUE);

  const essenceBefore = w.resources.player;
  S.cmdCancelTrain(w, base.id, 0);
  check('cancelling refunds in full', w.resources.player === essenceBefore + UT.worker.cost);
}

console.log('\n[16] outpost placement');
{
  const w = freshMap();
  const BT = constOf('BUILDING_TYPES');
  w.resources.player = 10000;
  const base = w.buildings.find(b => b.team === 'player');
  const capBefore = S.supplyCap(w, 'player');

  check('cannot place on top of an existing structure',
    !S.canPlaceBuilding(w, 'player', 'outpost', base.x + 0.5, base.z).ok);
  check('cannot place on an essence node',
    !S.canPlaceBuilding(w, 'player', 'outpost', w.nodes[0].x, w.nodes[0].z).ok);
  check('cannot place off the map',
    !S.canPlaceBuilding(w, 'player', 'outpost', 999, 0).ok);
  check('CAN place far from home — Cohort walks, it does not project (A7)',
    S.canPlaceBuilding(w, 'player', 'outpost', 0, 30).ok);

  const res = S.cmdPlaceBuilding(w, 'player', 'outpost', 0, 30);
  check('placement succeeds', res.ok);
  check('essence was spent at placement time', w.resources.player === 10000 - BT.outpost.cost);
  check('an unfinished site grants NO command yet', S.supplyCap(w, 'player') === capBefore);

  const poor = freshMap();
  poor.resources.player = 0;
  check('cannot afford, cannot place', !S.canPlaceBuilding(poor, 'player', 'outpost', 0, 30).ok);
}

console.log('\n[17] outposts work as drop-off points');
{
  const w = freshMap();
  w.resources.player = 10000;
  const node = w.nodes.find(n => n.x > 0);      // node on the RIVAL side, far from home
  const ws0 = workersOf(w, 'player');
  const place = S.cmdPlaceBuilding(w, 'player', 'outpost', node.x - 4, node.z, [ws0[1].id]);
  run(w, 1200);                                 // let the builder walk out and finish
  check('remote outpost finished', w.sites.length === 0 && w.buildings.length === 3);
  const u = ws0[0];
  S.cmdGather(w, [u.id], node.id);
  run(w, 1400);
  const nearest = S.nearestDropoff(w, 'player', node.x, node.z);
  check('the outpost is the nearest drop-off to that node', nearest.type === 'outpost');
  check('essence banked from a remote node', w.resources.player > 10000 - constOf('BUILDING_TYPES').outpost.cost);
}

console.log('\n[18] control range is territory, not a build restriction (A7)');
{
  const w = freshMap();
  w.resources.player = 10000;
  const base = w.buildings.find(b => b.team === 'player');
  check('own base is inside own control', S.isInControl(w, 'player', base.x, base.z));
  check('rival base is not inside player control', !S.isInControl(w, 'player', -base.x, -base.z));
  check('control does not gate placement', S.canPlaceBuilding(w, 'player', 'outpost', 0, 30).ok
    && !S.isInControl(w, 'player', 0, 30));
}


console.log('\n[19] Queue & Walk — construction is walked to, not conjured (1.6)');
{
  const w = freshMap();
  w.resources.player = 10000;
  const BT = constOf('BUILDING_TYPES');
  const u = workersOf(w, 'player')[0];
  const buildingsBefore = w.buildings.length;

  const res = S.cmdPlaceBuilding(w, 'player', 'outpost', -2, 6, [u.id]);
  check('placing creates a site, not a building', res.ok && w.sites.length === 1 && w.buildings.length === buildingsBefore);
  check('the worker was assigned', u.build.siteId === res.siteId);
  check('progress starts at zero', w.sites[0].progress === 0);

  run(w, 3);
  check('no progress while still walking', w.sites[0].progress === 0);

  run(w, 400);
  check('site completed into a real building', w.sites.length === 0 && w.buildings.length === buildingsBefore + 1);
  check('builder was released', u.build.siteId === null);
  check('finished outpost grants command', S.supplyCap(w, 'player') > BT.standard.command);
}

console.log('\n[20] reassignment PAUSES, it does not cancel (the point of 8.1)');
{
  const w = freshMap();
  w.resources.player = 10000;
  const u = workersOf(w, 'player')[0];
  const res = S.cmdPlaceBuilding(w, 'player', 'outpost', -2, 6, [u.id]);
  run(w, 60);
  const partial = w.sites[0].progress;
  check('some progress was made', partial > 0);

  S.cmdMove(w, [u.id], 20, 20);                 // yank the worker away
  check('worker released from the site', u.build.siteId === null);
  run(w, 80);
  check('site still exists', w.sites.length === 1);
  check('progress was RETAINED, not lost', w.sites[0].progress === partial);
  check('and did not advance while unattended', w.sites[0].progress === partial);

  S.cmdAssignBuilders(w, [u.id], res.siteId);   // send it back
  run(w, 400);
  check('resumes and completes', w.sites.length === 0);
}

console.log('\n[21] gathering and building are mutually exclusive');
{
  const w = freshMap();
  w.resources.player = 10000;
  const u = workersOf(w, 'player')[0];
  S.cmdGather(w, [u.id], w.nodes[0].id);
  const res = S.cmdPlaceBuilding(w, 'player', 'outpost', -2, 6, [u.id]);
  check('build order stops gathering', u.gather.state === 'idle');
  run(w, 40);
  S.cmdGather(w, [u.id], w.nodes[0].id);
  check('gather order releases the build site', u.build.siteId === null);
  check('site survives as paused', w.sites.length === 1);
  check('non-workers cannot be assigned as builders',
    S.cmdAssignBuilders(w, w.units.filter(x => !x.build).map(x => x.id), res.siteId).length === 0);
}

console.log('\n[22] site cancellation and placement blocking');
{
  const w = freshMap();
  w.resources.player = 10000;
  const BT = constOf('BUILDING_TYPES');
  const u = workersOf(w, 'player')[0];
  const res = S.cmdPlaceBuilding(w, 'player', 'outpost', -2, 6, [u.id]);
  run(w, 60);
  check('cannot place a second site on top of the first',
    !S.canPlaceBuilding(w, 'player', 'outpost', -2, 6).ok);

  const before = w.resources.player;
  S.cmdCancelSite(w, res.siteId);
  check('cancelling refunds in full', w.resources.player === before + BT.outpost.cost);
  check('site is gone', w.sites.length === 0);
  check('builder was released', u.build.siteId === null);
  check('the spot is free again', S.canPlaceBuilding(w, 'player', 'outpost', -2, 6).ok);
}

console.log('\n[23] multiple workers do not rush a build (assumption A8)');
{
  const timeWith = (n) => {
    const w = freshMap();
    w.resources.player = 10000;
    const ws = workersOf(w, 'player').slice(0, n).map(u => u.id);
    S.cmdPlaceBuilding(w, 'player', 'outpost', -2, 6, ws);
    let t = 0;
    while (w.sites.length && t < 2000) { S.simStep(w); t++; }
    return t;
  };
  const one = timeWith(1), four = timeWith(4);
  check('four workers build no faster than one', Math.abs(one - four) <= 2, `(1 worker ${one}t, 4 workers ${four}t)`);
}

console.log(`\n${'='.repeat(48)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(48)}\n`);
process.exit(fail ? 1 : 0);
