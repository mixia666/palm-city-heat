// Wanted system and police AI: spawn, chase, ram, busted meter, decay.
import { WANTED_CFG } from './config.js';
import { createCar } from './vehicles.js';
import { lerpAngle } from './random.js';
export function createWanted() { return { stars: 0, heat: 0, unseenT: 0, busted: 0, crimeFlash: 0 }; }
export function reportCrime(w, kind, witnessed) {
  if (!witnessed) return;
  const gain = { theft: 1, hitCar: 0.6, hitPed: 1, assault: 0.7, gunfire: 1, mission: 1, race: 0.4, reckless: 0.3 }[kind] || 0.5;
  w.heat += gain; w.crimeFlash = 1.2;
  while (w.heat >= 1 && w.stars < 5) { w.stars += 1; w.heat -= 1; }
  if (w.stars >= 5) w.heat = Math.min(w.heat, 0.9);
  w.unseenT = 0;
}
export function wantedTargetCount(stars) { return stars === 0 ? 0 : [0, 2, 3, 4, 6, 8][stars]; }
export function spawnPoliceCar(rng, playerPos, world) {
  const a = rng() * Math.PI * 2, d = 620;
  let x = Math.max(50, Math.min(world.width - 50, playerPos.x + Math.cos(a) * d));
  let y = Math.max(50, Math.min(world.height - 50, playerPos.y + Math.sin(a) * d));
  const car = createCar(x, y, a + Math.PI, 5, { driver: 'police', police: true });
  car.cruise = 330;
  return car;
}
export function updatePoliceCar(car, dt, target, world) {
  if (car.dead) return 'dead';
  const dx = target.x - car.x, dy = target.y - car.y; const distT = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  car.angle = lerpAngle(car.angle, want, Math.min(1, dt * 2.2));
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const top = distT > 260 ? 400 : distT > 90 ? 300 : 170;
  const cur = car.vx * fx + car.vy * fy;
  car.vx += fx * (cur < top ? 300 : -260) * dt; car.vy += fy * (cur < top ? 300 : -260) * dt;
  const lat = car.vx * -fy + car.vy * fx; car.vx -= -fy * lat * Math.min(1, 3.2 * dt); car.vy -= fx * lat * Math.min(1, 3.2 * dt);
  car.speed = cur;
  car.x += car.vx * dt; car.y += car.vy * dt;
  car.x = Math.max(20, Math.min(world.width - 20, car.x)); car.y = Math.max(20, Math.min(world.height - 20, car.y));
  const b = world.collidesBuilding(car.x, car.y, 20);
  if (b) { car.x -= car.vx * dt * 1.5; car.y -= car.vy * dt * 1.5; car.vx *= -0.3; car.vy *= -0.3; }
  return distT < 700 ? 'seen' : 'far';
}
export function updateWanted(w, dt, anyPoliceSees, playerSpeed, onFoot) {
  if (w.crimeFlash > 0) w.crimeFlash -= dt;
  if (w.stars === 0) { w.busted = 0; return null; }
  if (anyPoliceSees) w.unseenT = 0; else w.unseenT += dt;
  if (w.unseenT > WANTED_CFG.decayDelay) {
    w.decayT = (w.decayT || 0) + dt;
    if (w.decayT >= WANTED_CFG.decayEvery) { w.decayT = 0; w.stars -= 1; if (w.stars <= 0) { w.stars = 0; w.heat = 0; return 'cleared'; } }
  } else w.decayT = 0;
  // busted meter
  const slow = onFoot || Math.abs(playerSpeed) < 45;
  if (anyPoliceSees && slow) w.busted = Math.min(1, w.busted + dt * WANTED_CFG.bustedRate);
  else w.busted = Math.max(0, w.busted - dt * 0.35);
  if (w.busted >= 1) return 'busted';
  return null;
}
