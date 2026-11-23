// Palm City Heat — boot, game loop, states, interactions and mission glue.
import { STEP, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createWorld, districtAt, GARAGE_POS, HOSPITAL_POS, MARINA_POS } from './world.js';
import { spawnParkedCars, createCar, driveCar, carCollide } from './vehicles.js';
import { createPlayer, movePlayerOnFoot, createPedestrian, updatePedestrian } from './people.js';
import { createTrafficCar, updateTrafficCar } from './traffic.js';
import { createWanted, reportCrime, wantedTargetCount, spawnPoliceCar, updatePoliceCar, updateWanted } from './police.js';
import { createCombatState, damagePlayer, tryAttack, updateBullets } from './combat.js';
import { createMissionState, availableStoryMission, startStoryMission, missionRewardText, startTaxi, startRace, RACE_CHECKPOINTS, TAXI_DESTS, STORY } from './missions.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, makeSave, clearSave } from './save.js';
import { drawWorld, createCamera, updateCamera } from './render.js';
import { drawHud, drawPanel } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const rng = createRandom(seed);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 1280, H = 800;
function resize() { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; }
window.addEventListener('resize', resize); resize();

const world = createWorld(createRandom(seed));
const audio = createAudio();
const input = createInput(canvas);

function buildGame() {
  const parked = spawnParkedCars(createRandom(seed + 3), world, 26);
  const traffic = [];
  const trng = createRandom(seed + 9);
  for (let i = 0; i < 12; i++) traffic.push(createTrafficCar(trng, world));
  const peds = []; const prng = createRandom(seed + 21);
  for (let i = 0; i < 26; i++) peds.push(createPedestrian(prng, world));
  return {
    state: 'title', time: 0, money: 250, respect: 0,
    player: createPlayer(640, 520), world,
    parked, traffic, policeCars: [], peds,
    get allCars() { return [...this.parked, ...this.traffic, ...this.policeCars, ...(this.extraCars || [])]; },
    extraCars: [],
    wanted: createWanted(), combat: createCombatState(), missions: createMissionState(),
    camera: createCamera(), fx: [], particles: [], skids: [],
    objective: '', marker: null, prompt: '', dialogue: '', message: '', messageT: 0,
    timerText: '', timerUrgent: false, districtName: '', districtPopup: 0, lastDistrict: '',
    playerPos: { x: 640, y: 520 }, playerAngle: 0, garageCd: 0, saveCd: 0, raceOfferCd: 0,
  };
}
let game = buildGame();
game.camera.x = game.player.x; game.camera.y = game.player.y;

function playerPos() { return game.player.car ? game.player.car : game.player; }
function witnessed(range) { for (const ped of game.peds) if (!ped.dead && Math.hypot(ped.x - game.player.x, ped.y - game.player.y) < range) return true; return game.policeCars.length > 0; }
function addFx(kind, x, y, color) { game.fx.push({ kind, x, y, t: 0.3, max: 0.3, color }); }
function addSmoke(x, y, big) { game.particles.push({ x, y, r: big ? 13 : 7, t: 0.9, max: 0.9, color: '#dddddd' }); }
function showMessage(text, secs) { game.message = text; game.messageT = secs || 3.5; }
function syncMissionView() {
  const ms = game.missions;
  game.objective = ms.objective || (ms.taxi ? game.objective : '') || '';
  if (ms.active || ms.taxi || ms.race) game.marker = ms.marker;
  else if (!shotName) game.marker = null;
  game.dialogue = ms.dialogueT > 0 ? ms.dialogue : '';
  if (ms.active && ms.timer > 0) { const t = Math.max(0, Math.ceil(ms.timer)); game.timerText = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; game.timerUrgent = t <= 15; }
  else if (ms.race) { game.timerText = `${Math.ceil(ms.race.timer)}s`; game.timerUrgent = ms.race.timer < 20; }
  else game.timerText = '';
}

function newGame() {
  clearSave();
  const keepState = game.state;
  game = buildGame(); game.state = 'play';
  showMessage('Welcome to Palm City. Find Rosa\'s jobs at gold markers — good luck!', 5);
}
function continueGame() {
  const s = loadSave(); game = buildGame(); game.state = 'play';
  if (s) { game.money = s.money; game.respect = s.respect; game.missions.storyIndex = s.storyIndex; game.missions.storyDone = s.storyDone; game.combat.hasPistol = s.hasPistol; game.combat.ammo = s.ammo; if (s.hasPistol) game.combat.weapon = 'pistol'; game.player.x = s.x || 640; game.player.y = s.y || 520; }
  game.camera.x = game.player.x; game.camera.y = game.player.y;
  showMessage('Welcome back to Palm City.', 3);
}
function saveNow() { writeSave(makeSave(game)); }

function nearestCar(maxD) { let best = null, bd = maxD; for (const c of game.allCars) { if (c.dead) continue; const d = Math.hypot(c.x - game.player.x, c.y - game.player.y); if (d < bd) { bd = d; best = c; } } return best; }
function enterCar(car) {
  if (!car.driver || car.driver === 'parked') { /* steal */ }
  const wasParked = car.parked; const wasTraffic = car.driver === 'traffic';
  if (wasTraffic) { game.traffic = game.traffic.filter((c) => c !== car); game.extraCars.push(car); }
  game.parked = game.parked.filter((c) => c !== car); if (!game.extraCars.includes(car)) game.extraCars.push(car);
  car.parked = false; car.driver = 'player'; game.player.car = car;
  if (wasParked || wasTraffic) { reportCrime(game.wanted, 'theft', witnessed(260)); audio.pickup(); }
  // mission steal check
  const ms = game.missions;
  if (ms.active && ms.active.type === 'stealCar' && ms.phase === 0 && car.isTarget) { ms.phase = 1; ms.marker = ms.active.to; ms.objective = 'Deliver the Palm Runner to the Repaint Garage'; showMessage('Got it! Take it to Marco\'s garage.', 3); }
}
function exitCar() { const car = game.player.car; if (!car) return; car.driver = null; car.vx *= 0.2; car.vy *= 0.2; game.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30; game.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30; game.player.car = null; }

function completeMission() {
  const ms = game.missions; const def = ms.active; if (!def) return;
  game.money += def.cash; game.respect += def.respect; audio.cash();
  showMessage(missionRewardText(def), 5);
  if (def.id === 'm1' && !game.combat.hasPistol) { game.combat.hasPistol = true; game.combat.ammo = 24; game.combat.weapon = 'pistol'; showMessage('Mission complete! Rosa slips you a Pistol (Q to swap, click to fire).', 5); }
  ms.active = null; ms.objective = ''; ms.marker = null; ms.timer = 0;
  ms.storyIndex += 1; if (ms.storyIndex >= STORY.length) { ms.storyDone = true; game.state = 'storydone'; }
  saveNow();
}
function failMission(reason) { const ms = game.missions; ms.active = null; ms.objective = ''; ms.marker = null; ms.timer = 0; showMessage('Mission failed: ' + reason + ' — visit the marker to retry.', 4.5); }

function startAvailableMission() {
  const ms = game.missions; if (ms.active || ms.taxi || ms.race) return false;
  const def = availableStoryMission(ms); if (!def) return false;
  startStoryMission(ms, ms.storyIndex);
  if (def.type === 'stealCar') {
    const car = createCar(def.target.x, def.target.y, 0.4, 2, { parked: true }); car.isTarget = true; car.health = 100; game.extraCars.push(car); ms.targetCar = car;
  }
  if (def.type === 'chase') {
    const van = createCar(def.target.x, def.target.y, 0, 3, { driver: 'flee' }); van.health = 130; van.isTarget = true; game.extraCars.push(van); ms.targetCar = van;
  }
  if (def.type === 'escape') { game.wanted.stars = 3; game.wanted.heat = 0; }
  if (def.type === 'getaway') { const car = createCar(game.player.x + 70, game.player.y, 0, 4, { parked: true }); car.isTarget = true; game.extraCars.push(car); showMessage('Your Night Viper is parked nearby — grab it and GO!', 4); }
  audio.pickup(); return true;
}

function updateMissions(dt) {
  const ms = game.missions; const pp = playerPos();
  if (ms.dialogueT > 0) ms.dialogueT -= dt;
  if (ms.messageT > 0) ms.messageT -= dt;
  if (game.messageT > 0) { game.messageT -= dt; if (game.messageT <= 0) game.message = ''; }
  if (!ms.active) { syncMissionView(); return; }
  const def = ms.active;
  if (def.time && ms.phase >= 0 && !(def.type === 'deliver' && ms.phase === 0 && false)) {
    if (def.type !== 'deliver' || ms.phase === 1) { ms.timer -= dt; if (ms.timer <= 0) { failMission('out of time'); syncMissionView(); return; } }
    else if (def.type === 'getaway') { ms.timer -= dt; }
  }
  if (def.type === 'getaway') { ms.timer -= 0; ms.timer = ms.timer; if (ms.timer <= 0) { failMission('out of time'); syncMissionView(); return; } }
  const dTo = ms.marker ? Math.hypot(pp.x - ms.marker.x, pp.y - ms.marker.y) : 9999;
  if (def.type === 'deliver') {
    if (ms.phase === 0 && dTo < 55) { ms.phase = 1; ms.marker = def.to; ms.timer = def.time; ms.objective = 'Deliver the package to the Marina — GO!'; audio.pickup(); showMessage('Package picked up! The clock is running.', 3); }
    else if (ms.phase === 1 && dTo < 60) completeMission();
  } else if (def.type === 'stealCar') {
    if (ms.phase === 1 && game.player.car === ms.targetCar && Math.hypot(pp.x - def.to.x, pp.y - def.to.y) < 70) completeMission();
    if (ms.targetCar && ms.targetCar.dead) failMission('the car was wrecked');
  } else if (def.type === 'chase') {
    const van = ms.targetCar;
    if (van) {
      if (!van.dead) {
        const away = Math.atan2(van.y - pp.y, van.x - pp.x);
        van.angle += ((away - van.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 2);
        const sp = 215; van.vx = Math.cos(van.angle) * sp; van.vy = Math.sin(van.angle) * sp; van.x += van.vx * dt; van.y += van.vy * dt;
        van.x = Math.max(30, Math.min(WORLD.width - 200, van.x)); van.y = Math.max(30, Math.min(WORLD.height - 30, van.y));
        if (world.collidesBuilding(van.x, van.y, 20)) { van.x -= van.vx * dt * 2; van.y -= van.vy * dt * 2; van.angle += 1.2; }
        ms.marker = { x: van.x, y: van.y };
        if (van.health <= 25) { van.dead = true; completeMission(); }
      }
    }
  } else if (def.type === 'escape') {
    if (game.wanted.stars === 0 && dTo < 70) completeMission();
    else ms.objective = game.wanted.stars > 0 ? `Lose the police (${game.wanted.stars}★) then reach the Hideout` : 'Reach the Hideout!';
  } else if (def.type === 'getaway') {
    if (dTo < 65) completeMission();
  }
  syncMissionView();
}
function updateTaxiRace(dt) {
  const ms = game.missions; const pp = playerPos();
  if (ms.taxi) {
    const t = ms.taxi;
    if (t.phase === 0) {
      if (game.player.car && Math.hypot(pp.x - t.ped.x, pp.y - t.ped.y) < 60) { t.phase = 1; t.ped.hidden = true; ms.marker = t.dest; ms.objective = 'Taxi: drop your passenger at the yellow marker'; showMessage('Passenger in! Drive to the marker.', 2.5); }
    } else if (Math.hypot(pp.x - t.dest.x, pp.y - t.dest.y) < 65 && game.player.car) {
      const fare = 60 + Math.floor(Math.hypot(t.dest.x - pp.x, t.dest.y - pp.y) / 50);
      game.money += 120; game.respect += 2; audio.cash(); showMessage('Taxi fare paid: +$120  +2 Respect', 3.5);
      t.ped.hidden = false; t.ped.x = pp.x + 30; t.ped.y = pp.y; t.ped.wantsTaxi = false; ms.taxi = null; ms.objective = ''; ms.marker = null;
    }
  }
  if (ms.race) {
    ms.race.timer -= dt;
    if (ms.race.timer <= 0) { ms.race = null; ms.objective = ''; ms.marker = null; showMessage('Race over — out of time.', 3); }
    else {
      const cp = ms.race.checkpoints[ms.race.idx];
      if (game.player.car && Math.hypot(pp.x - cp.x, pp.y - cp.y) < 70) { ms.race.idx += 1; audio.pickup(); if (ms.race.idx >= ms.race.checkpoints.length) { game.money += 400; game.respect += 12; audio.cash(); showMessage('Race won! +$400  +12 Respect', 4); ms.race = null; ms.objective = ''; ms.marker = null; } else { ms.marker = ms.race.checkpoints[ms.race.idx]; ms.objective = `Street race: checkpoint ${ms.race.idx + 1}/${ms.race.checkpoints.length}`; } }
    }
  }
  syncMissionView();
}

function step(dt) {
  game.time += dt;
  const p = game.player, ms = game.missions;
  if (p.attackCd > 0) p.attackCd -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (game.districtPopup > 0) game.districtPopup -= dt;
  if (game.garageCd > 0) game.garageCd -= dt;
  if (game.saveCd > 0) game.saveCd -= dt;
  // aim
  const pp = playerPos();
  const aimWorld = { x: game.camera.x - W / 2 + input.mouse.x, y: game.camera.y - H / 2 + input.mouse.y };
  if (!p.car) p.angle = Math.atan2(aimWorld.y - p.y, aimWorld.x - p.x);
  // district popup
  const dName = districtAt(pp.x, pp.y).name;
  if (dName !== game.lastDistrict) { game.lastDistrict = dName; game.districtName = dName; game.districtPopup = 2.4; }
  let chaos = null;
  if (p.car) {
    const car = p.car;
    const inp = { up: input.isDown('KeyW', 'ArrowUp'), down: input.isDown('KeyS', 'ArrowDown'), left: input.isDown('KeyA', 'ArrowLeft'), right: input.isDown('KeyD', 'ArrowRight'), handbrake: input.isDown('Space') };
    const impact = driveCar(car, inp, dt, world);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (car.skid > 0.4 && Math.abs(car.speed) > 60) { game.skids.push({ x1: car.x - Math.cos(car.angle) * 16, y1: car.y - Math.sin(car.angle) * 16, x2: car.x, y2: car.y, t: 9 }); if (Math.random() < 0.5) addSmoke(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, false); }
    if (game.skids.length > 220) game.skids.splice(0, game.skids.length - 220);
    if (impact > 130) { damagePlayer(p, impact * 0.04); game.combat.shake = 0.4; audio.crash(true); reportCrime(game.wanted, 'hitCar', witnessed(280)); addFx('hit', car.x, car.y, '#ffb347'); }
    if (Math.abs(car.speed) > 200) chaos = car;
    audio.updateEngine(car.speed / 400, true, game.time);
  } else {
    movePlayerOnFoot(p, input.moveAxis(), input.isDown('ShiftLeft', 'ShiftRight'), dt, world);
    audio.updateEngine(0, false, game.time);
  }
  // car-car collisions
  const cars = game.allCars;
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const rel = carCollide(cars[i], cars[j]);
    if (rel > 110 && (cars[i] === p.car || cars[j] === p.car)) { audio.crash(rel > 200); game.combat.shake = 0.3; damagePlayer(p, rel * 0.03); reportCrime(game.wanted, 'hitCar', witnessed(280)); addFx('hit', p.x, p.y, '#ffb347'); }
  }
  // run over peds
  if (p.car && Math.abs(p.car.speed) > 55) {
    for (const ped of game.peds) { if (ped.dead || ped.hidden) continue; if (Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 26) { ped.dead = true; damagePlayer(p, 0); reportCrime(game.wanted, 'hitPed', witnessed(300)); addFx('hit', ped.x, ped.y, '#ff5a5a'); audio.crash(false); showMessage('You hit a pedestrian!', 2); } }
  }
  // traffic
  const obstacles = [...game.traffic, ...game.policeCars, ...(p.car ? [p.car] : [])];
  for (const c of game.traffic) updateTrafficCar(c, dt, world, obstacles, chaos);
  for (const c of game.extraCars) { if (c.driver === 'player' || c.dead) continue; if (c.health <= 0) c.dead = true; }
  // peds
  const danger = (game.wanted.stars > 0 || (p.car && Math.abs(p.car.speed) > 190)) ? pp : (game.combat.muzzle > 0 ? pp : null);
  for (const ped of game.peds) { if (!ped.hidden) updatePedestrian(ped, dt, danger, world); }
  // combat input
  if ((input.mouse.clicked || input.wasPressed('Space')) && !p.car && game.state === 'play') {
    const targets = [...game.peds];
    const res = tryAttack(game.combat, p, p.angle, targets, game.fx);
    if (res === 'shot') { audio.shot(); reportCrime(game.wanted, 'gunfire', witnessed(340)); }
    if (res === 'hitPed') { audio.punch(); reportCrime(game.wanted, 'assault', witnessed(260)); }
    if (res === 'swing') audio.punch();
  }
  const bulletHits = updateBullets(game.combat, dt, world, game.peds, game.fx);
  if (bulletHits.length) reportCrime(game.wanted, 'assault', witnessed(340));
  // bullets can damage chase target car? damage via proximity: skip
  // police spawning
  const want = wantedTargetCount(game.wanted.stars);
  if (game.wanted.stars > 0 && game.policeCars.length < want && Math.random() < dt * 1.4) game.policeCars.push(spawnPoliceCar(Math.random, pp, world));
  if (game.wanted.stars === 0 && game.policeCars.length) { game.policeCars = game.policeCars.filter((c) => Math.hypot(c.x - pp.x, c.y - pp.y) < 800); }
  let anySees = false;
  for (const pc of game.policeCars) {
    const seen = updatePoliceCar(pc, dt, pp, world);
    if (seen === 'seen' && Math.hypot(pc.x - pp.x, pc.y - pp.y) < 520) anySees = true;
    if (p.car && Math.hypot(pc.x - p.car.x, pc.y - p.car.y) < 42 && Math.abs(p.car.speed) > 60) { /* ram */ }
    // police damage player on contact on foot
    if (!p.car && Math.hypot(pc.x - p.x, pc.y - p.y) < 30 && Math.abs(pc.speed) > 80) damagePlayer(p, dt * 30);
  }
  audio.sirenLevel(game.wanted.stars);
  const wres = updateWanted(game.wanted, dt, anySees, p.car ? p.car.speed : 0, !p.car);
  if (wres === 'busted') { game.state = 'busted'; const fine = Math.min(game.money, 200 + game.wanted.stars * 80); game.money -= fine; game.bustedFine = fine; game.wanted.stars = 0; game.wanted.busted = 0; game.policeCars = []; if (p.car) exitCar(); }
  if (wres === 'cleared') showMessage('You lost the police. Heat cleared.', 3);
  // fx timers
  for (const f of game.fx) f.t -= dt; game.fx = game.fx.filter((f) => f.t > 0);
  for (const pt of game.particles) { pt.t -= dt; pt.y -= dt * 22; pt.r += dt * 9; } game.particles = game.particles.filter((x) => x.t > 0);
  for (const s of game.skids) s.t -= dt * 0.25; game.skids = game.skids.filter((s) => s.t > 0);
  // interactions / prompts
  game.prompt = '';
  const nearMission = !ms.active && !ms.taxi && !ms.race && availableStoryMission(ms);
  const missionAnchor = { x: 700, y: 430 };
  if (!p.car) {
    const nc = nearestCar(52);
    if (nc) game.prompt = 'Press E to ' + (nc.police ? 'steal the police car' : 'enter car');
    if (nearMission && Math.hypot(p.x - missionAnchor.x, p.y - missionAnchor.y) < 70) game.prompt = `Press F — Story: ${availableStoryMission(ms).title} (${availableStoryMission(ms).giver})`;
    for (const ped of game.peds) if (ped.wantsTaxi && !ped.dead && game.player.car && false) {}
  } else {
    game.prompt = 'E: exit car · Space: handbrake · WASD: drive';
    if (Math.hypot(p.car.x - GARAGE_POS.x, p.car.y - GARAGE_POS.y) < 75) game.prompt = game.wanted.stars > 0 ? `Repaint Garage: press F to clear wanted for $${150 + game.wanted.stars * 100}` : 'Repaint Garage — you are clean';
    for (const ped of game.peds) if (ped.wantsTaxi && !ped.dead && !ms.taxi && Math.hypot(p.car.x - ped.x, p.car.y - ped.y) < 62 && Math.abs(p.car.speed) < 30) game.prompt = 'Taxi fare waiting — stop to pick them up (automatic)';
    if (!ms.active && !ms.taxi && !ms.race && Math.hypot(p.car.x - 1542, p.car.y - 342) < 80) game.prompt = 'Press F to start the Sunset Street Race (+$400)';
  }
  if (input.wasPressed('KeyE')) {
    audio.unlock();
    if (p.car) exitCar(); else { const nc = nearestCar(52); if (nc) enterCar(nc); }
  }
  if (input.wasPressed('KeyQ') && game.combat.hasPistol) { game.combat.weapon = game.combat.weapon === 'pistol' ? 'fists' : 'pistol'; }
  if (input.wasPressed('KeyM')) showMessage(audio.toggleMute() ? 'Sound muted' : 'Sound on', 1.6);
  if (input.wasPressed('KeyF')) {
    audio.unlock();
    if (p.car && Math.hypot(p.car.x - GARAGE_POS.x, p.car.y - GARAGE_POS.y) < 80 && game.wanted.stars > 0) {
      const fee = 150 + game.wanted.stars * 100;
      if (game.money >= fee) { game.money -= fee; game.wanted.stars = 0; game.wanted.heat = 0; game.policeCars = []; audio.cash(); showMessage(`Repainted! Wanted cleared for $${fee}.`, 3.5); saveNow(); }
      else showMessage('Not enough cash for a repaint.', 2.5);
    } else if (!ms.active && !ms.taxi && !ms.race) {
      if (!p.car && Math.hypot(p.x - missionAnchor.x, p.y - missionAnchor.y) < 75) startAvailableMission();
      else if (p.car && Math.hypot(p.car.x - 1542, p.car.y - 342) < 85) { startRace(ms, RACE_CHECKPOINTS); audio.pickup(); }
      else if (!p.car) startAvailableMission();
    }
  }
  // taxi pickup handled in updateTaxiRace via proximity; flag a ped
  updateMissions(dt); updateTaxiRace(dt);
  if (!ms.active && !ms.taxi && !ms.race) {
    // offer taxi: nearest wanting ped becomes fare when player in car nearby
    if (p.car) for (const ped of game.peds) if (ped.wantsTaxi && !ped.dead && Math.hypot(p.car.x - ped.x, p.car.y - ped.y) < 58 && Math.abs(p.car.speed) < 35) { const dest = TAXI_DESTS[Math.floor(Math.random() * TAXI_DESTS.length)]; startTaxi(ms, ped, dest); break; }
  }
  // mission marker default when idle: point to Rosa anchor
  if (!ms.active && !ms.taxi && !ms.race && availableStoryMission(ms)) { game.marker = missionAnchor; game.objective = `Story: ${availableStoryMission(ms).title} — meet Rosa downtown (gold marker)`; }
  else if (!ms.active && !ms.taxi && !ms.race && ms.storyDone) { game.objective = 'Free roam: taxi fares (yellow !) and street races pay cash'; game.marker = null; }
  syncMissionView();
  // death
  if (p.health <= 0 && !p.dead) p.dead = true;
  if (p.dead) { game.state = 'over'; const fee = Math.min(game.money, 150); game.money -= fee; game.deathFee = fee; }
  // camera
  game.playerPos = pp; game.playerAngle = p.car ? p.car.angle : p.angle;
  updateCamera(game.camera, pp, p.car ? p.car : { x: 0, y: 0 }, dt, W, H);
  if (game.combat.shake > 0) { game.combat.shake -= dt; game.camera.shakeX = (Math.random() - 0.5) * 14 * game.combat.shake; game.camera.shakeY = (Math.random() - 0.5) * 14 * game.combat.shake; } else { game.camera.shakeX = 0; game.camera.shakeY = 0; }
  if (game.saveCd <= 0 && game.state === 'play') { game.saveCd = 6; saveNow(); }
}

function draw() {
  ctx.fillStyle = '#1c1420'; ctx.fillRect(0, 0, W, H);
  const view = { player: game.player, world: game.world, allCars: game.allCars, traffic: game.traffic, policeCars: game.policeCars, peds: game.peds, combat: game.combat, fx: game.fx, particles: game.particles, skids: game.skids, marker: game.marker };
  drawWorld(ctx, view, game.camera, W, H, game.time);
  if (game.state === 'title') {
    drawHudTitle();
    return;
  }
  const hudView = { player: game.player, money: game.money, respect: game.respect, wanted: game.wanted, combat: game.combat, objective: game.objective, marker: game.marker, traffic: game.traffic, policeCars: game.policeCars, playerPos: playerPos(), playerAngle: game.playerAngle, dialogue: game.dialogue, message: game.messageT > 0 ? game.message : '', districtPopup: game.districtPopup, districtName: game.districtName, prompt: game.prompt, timerText: game.timerText, timerUrgent: game.timerUrgent };
  if (game.state === 'play') drawHud(ctx, W, H, hudView);
  else if (game.state === 'paused') { drawHud(ctx, W, H, hudView); drawPanel(ctx, W, H, 'PAUSED', ['WASD drive / walk · E enter car · F interact', 'Click / Space attack · Q swap weapon · M mute', '', 'Press P or Esc to resume · Progress auto-saves'], '#ffb347'); }
  else if (game.state === 'over') drawPanel(ctx, W, H, 'TAKEN DOWN', [`Palm City Hospital patched you up. Fee: $${game.deathFee || 150}`, `Cash $${game.money} · Respect ${game.respect}`, '', 'Press Enter to wake up at the hospital'], '#ff5a5a');
  else if (game.state === 'busted') drawPanel(ctx, W, H, 'CAUGHT', [`The Palm City PD got you. Fine paid: $${game.bustedFine || 200}`, 'Your wanted level has been cleared.', '', 'Press Enter to walk free'], '#3d8bfd');
  else if (game.state === 'storydone') drawPanel(ctx, W, H, 'STORY COMPLETE!', ['Rosa: "You own these streets now, heat and all."', `Final cash $${game.money} · Respect ${game.respect}`, 'Free roam, taxi fares and races stay open.', 'Press Enter to keep cruising Palm City'], '#7dff9a');
  else if (game.state === 'complete') drawPanel(ctx, W, H, 'MISSION COMPLETE', [game.message || '', 'Press Enter to continue'], '#7dff9a');
}
function drawHudTitle() {
  ctx.fillStyle = 'rgba(16,8,22,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 74px system-ui, sans-serif'; ctx.fillText('PALM CITY HEAT', W / 2, H * 0.16);
  ctx.fillStyle = '#fff6e8'; ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('A sun-soaked open-world crime story — steal cars, run missions, outrun the heat.', W / 2, H * 0.16 + 92);
  const has = (() => { try { return !!window.localStorage.getItem('palm-city-heat.save.v1'); } catch { return false; } })();
  ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillStyle = '#7dff9a';
  ctx.fillText(has ? '▶  Press ENTER — New Game      ·      C — Continue' : '▶  Press ENTER — New Game', W / 2, H * 0.52);
  ctx.fillStyle = '#c9b8a8'; ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('WASD move / drive · Mouse aim · Click/Space attack · E enter car · F interact · Q weapon · P pause · M mute', W / 2, H * 0.52 + 48);
  ctx.fillText('Story by Rosa Delgado, Marco Vale & Benny Cole — five missions across Palm City.', W / 2, H * 0.52 + 78);
  // mini HUD preview so title still shows systems
  const hudView = { player: game.player, money: game.money, respect: game.respect, wanted: game.wanted, combat: game.combat, objective: 'Explore Palm City — Downtown Palms', marker: game.marker, traffic: game.traffic, policeCars: game.policeCars, playerPos: playerPos(), playerAngle: 0, dialogue: '', message: '', districtPopup: 0, districtName: '', prompt: '', timerText: '', timerUrgent: false };
  drawHud(ctx, W, H, hudView);
}

let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, 0.25); last = now;
  // state keys
  if (game.state === 'title') {
    if (input.wasPressed('Enter')) { audio.unlock(); newGame(); }
    else if (input.wasPressed('KeyC')) { audio.unlock(); continueGame(); }
    game.time += 1 / 60;
  } else if (game.state === 'play') {
    if (input.wasPressed('KeyP', 'Escape')) game.state = 'paused';
    else while (acc >= STEP) { step(STEP); acc -= STEP; if (game.state !== 'play') { acc = 0; break; } }
  } else if (game.state === 'paused') {
    if (input.wasPressed('KeyP', 'Escape', 'Enter')) game.state = 'play';
    acc = 0;
  } else if (game.state === 'over') {
    if (input.wasPressed('Enter')) { game.player.health = 100; game.player.dead = false; game.player.car = null; game.player.x = HOSPITAL_POS.x; game.player.y = HOSPITAL_POS.y + 40; game.wanted.stars = 0; game.policeCars = []; game.state = 'play'; saveNow(); }
    acc = 0;
  } else if (game.state === 'busted') {
    if (input.wasPressed('Enter')) { game.player.x = 500; game.player.y = 500; game.player.car = null; game.state = 'play'; saveNow(); }
    acc = 0;
  } else if (game.state === 'storydone' || game.state === 'complete') {
    if (input.wasPressed('Enter')) game.state = 'play';
    acc = 0;
  }
  draw();
  input.endFrame();
}

if (shotName) {
  stageShot(shotName, game);
  game.playerPos = playerPos(); game.playerAngle = game.player.car ? game.player.car.angle : game.player.angle;
  syncMissionView();
  if (shotName === 'mission') { game.dialogue = game.missions.dialogue; game.objective = 'Mission: Hot Package — deliver to the Marina (1,840m)'; game.timerText = '01:12'; }
  if (shotName === 'chase') { game.objective = 'Escape the police — break their line of sight!'; }
  let painted = 0;
  const paint = () => { game.time += 0.016; draw(); painted++; if (painted < 3) requestAnimationFrame(paint); else window.__shotReady = true; };
  requestAnimationFrame(paint);
} else {
  requestAnimationFrame(frame);
}
