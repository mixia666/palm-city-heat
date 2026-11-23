// Traffic AI: cars follow the road grid, slow for obstacles, flee chaos.
import { CAR_MODELS } from './config.js';
import { createCar } from './vehicles.js';
import { randRange } from './random.js';
export function createTrafficCar(rng, world) {
  const horiz = rng() > 0.5;
  const lane = Math.floor(randRange(rng, 0, 11)) * 300 + 42 + (rng() > 0.5 ? 21 : 0);
  const along = randRange(rng, 60, horiz ? world.width - 300 : world.height - 60);
  const x = horiz ? along : lane, y = horiz ? lane : along;
  const dir = rng() > 0.5 ? 1 : -1;
  const car = createCar(x, y, horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), Math.floor(rng() * 5), { driver: 'traffic' });
  car.cruise = randRange(rng, 110, 190); car.dirSign = dir; car.horiz = horiz;
  return car;
}
export function updateTrafficCar(car, dt, world, obstacles, chaos) {
  if (car.dead) return;
  // choose target speed: stop if obstacle ahead
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  let target = car.cruise;
  if (chaos && Math.hypot(chaos.x - car.x, chaos.y - car.y) < 170) target = 300; // flee fast
  for (const o of obstacles) {
    if (o === car) continue;
    const dx = o.x - car.x, dy = o.y - car.y; const ahead = dx * fx + dy * fy; const side = Math.abs(dx * -fy + dy * fx);
    if (ahead > 0 && ahead < 78 && side < 26) { target = Math.min(target, ahead < 44 ? 0 : 60); }
  }
  // at intersections sometimes turn
  const mx = ((car.x % 300) + 300) % 300, my = ((car.y % 300) + 300) % 300;
  const nearCross = mx < 50 && my < 50;
  if (nearCross && !car.turnCd) {
    car.turnCd = 1.2;
    if (Math.random() < 0.3) car.angle += (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  }
  if (car.turnCd) car.turnCd -= dt;
  const cur = car.vx * fx + car.vy * fy;
  const accel = cur < target ? 200 : -320;
  car.vx += fx * accel * dt; car.vy += fy * accel * dt;
  // kill lateral drift, keep on road
  const lat = car.vx * -fy + car.vy * fx; car.vx -= -fy * lat * Math.min(1, 4 * dt); car.vy -= fx * lat * Math.min(1, 4 * dt);
  car.speed = car.vx * fx + car.vy * fy;
  car.x += car.vx * dt; car.y += car.vy * dt;
  if (car.x < 30 || car.x > world.width - 30 || car.y < 30 || car.y > world.height - 30) { car.angle += Math.PI; car.x = Math.max(30, Math.min(world.width - 30, car.x)); car.y = Math.max(30, Math.min(world.height - 30, car.y)); }
  const b = world.collidesBuilding(car.x, car.y, 20);
  if (b) { car.x -= car.vx * dt * 1.5; car.y -= car.vy * dt * 1.5; car.vx *= -0.3; car.vy *= -0.3; }
}
