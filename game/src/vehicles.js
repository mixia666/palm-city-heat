// Car models, spawning parked cars and driving physics with drift and collisions.
import { CAR_MODELS } from './config.js';
import { randRange, pick } from './random.js';

export function createCar(x, y, angle, modelIdx, opts = {}) {
  const m = CAR_MODELS[modelIdx];
  return { x, y, angle, vx: 0, vy: 0, speed: 0, steer: 0, model: modelIdx, w: m.w, h: m.h, health: 100, driver: opts.driver || null, parked: !!opts.parked, police: !!opts.police, dead: false, smokeT: 0, skid: 0 };
}
export function spawnParkedCars(rng, world, count) {
  const cars = [];
  let tries = 0;
  while (cars.length < count && tries++ < 600) {
    const x = randRange(rng, 80, world.width - 200), y = randRange(rng, 60, world.height - 60);
    // park along road edges
    const bx = Math.floor(x / 300) * 300, by = Math.floor(y / 300) * 300;
    const horiz = rng() > 0.5;
    const px = horiz ? x : bx + 70 + (rng() > 0.5 ? 222 : 0);
    const py = horiz ? by + 70 + (rng() > 0.5 ? 222 : 0) : y;
    if (world.collidesBuilding(px, py, 26)) continue;
    cars.push(createCar(px, py, horiz ? 0 : Math.PI / 2, Math.floor(rng() * 5), { parked: true }));
  }
  return cars;
}
export function driveCar(car, input, dt, world) {
  const m = CAR_MODELS[car.model];
  const fwdX = Math.cos(car.angle), fwdY = Math.sin(car.angle);
  const fwdSpeed = car.vx * fwdX + car.vy * fwdY;
  let throttle = 0;
  if (input.up) throttle = 1; else if (input.down) throttle = fwdSpeed > 8 ? -1.4 : -0.55;
  const accel = throttle * m.accel;
  car.vx += fwdX * accel * dt; car.vy += fwdY * accel * dt;
  // steering scales with speed, drift = lateral grip loss
  const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  car.steer += (steerInput - car.steer) * Math.min(1, dt * 8);
  const steerAmt = car.steer * 0.62 * Math.min(1, Math.abs(fwdSpeed) / 90) * (fwdSpeed < 0 ? -1 : 1);
  if (Math.abs(fwdSpeed) > 4) car.angle += steerAmt * dt * (140 / Math.max(60, Math.abs(fwdSpeed))) * 2.4;
  const handbrake = input.handbrake;
  const grip = handbrake ? m.grip * 0.35 : m.grip;
  const latX = -fwdY, latY = fwdX;
  const latSpeed = car.vx * latX + car.vy * latY;
  car.skid = Math.abs(latSpeed) > 55 || (handbrake && Math.abs(fwdSpeed) > 60) ? 1 : Math.max(0, car.skid - dt * 3);
  car.vx -= latX * latSpeed * Math.min(1, grip * dt);
  car.vy -= latY * latSpeed * Math.min(1, grip * dt);
  // drag + top speed
  const drag = handbrake ? 1.6 : 0.35;
  car.vx -= car.vx * drag * dt * 0.4; car.vy -= car.vy * drag * dt * 0.4;
  const sp = Math.hypot(car.vx, car.vy);
  if (sp > m.top) { car.vx *= m.top / sp; car.vy *= m.top / sp; }
  car.speed = car.vx * fwdX + car.vy * fwdY;
  car.x += car.vx * dt; car.y += car.vy * dt;
  car.x = Math.max(20, Math.min(world.width - 20, car.x));
  car.y = Math.max(20, Math.min(world.height - 20, car.y));
  const b = world.collidesBuilding(car.x, car.y, 20);
  if (b) {
    const impact = Math.abs(car.speed);
    car.x -= car.vx * dt * 1.4; car.y -= car.vy * dt * 1.4;
    car.vx *= -0.25; car.vy *= -0.25;
    if (impact > 120) { car.health -= impact * 0.06; return impact; }
    return 0;
  }
  if (world.inWater(car.x)) { car.vx *= 0.9; car.vy *= 0.9; car.health -= dt * 8; }
  return 0;
}
export function carCollide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy); const min = 40;
  if (d === 0 || d >= min) return 0;
  const nx = dx / d, ny = dy / d, push = (min - d) / 2;
  a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
  const rel = Math.abs((a.vx - b.vx) * nx + (a.vy - b.vy) * ny);
  const tvx = a.vx, tvy = a.vy; a.vx = b.vx * 0.7; a.vy = b.vy * 0.7; b.vx = tvx * 0.7; b.vy = tvy * 0.7;
  if (rel > 90) { a.health -= rel * 0.05; b.health -= rel * 0.05; }
  return rel;
}
