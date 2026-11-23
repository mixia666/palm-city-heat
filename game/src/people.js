// Player on-foot movement and pedestrian logic: stroll, flee, taxi customers.
import { PLAYER_CFG } from './config.js';
import { randRange, pick } from './random.js';
const SHIRTS = ['#ff8fab', '#3d8bfd', '#f2c94c', '#81b29a', '#e07a5f', '#f4f1de', '#b388ff'];
export function createPlayer(x, y) {
  return { x, y, angle: 0, health: PLAYER_CFG.health, armor: 0, car: null, attackCd: 0, hurtT: 0, dead: false, walkPhase: 0 };
}
export function movePlayerOnFoot(p, axis, sprint, dt, world) {
  const sp = sprint ? PLAYER_CFG.sprint : PLAYER_CFG.walk;
  if (axis.x || axis.y) {
    const len = Math.hypot(axis.x, axis.y) || 1;
    const nx = p.x + (axis.x / len) * sp * dt, ny = p.y + (axis.y / len) * sp * dt;
    if (!world.collidesBuilding(nx, p.y, 12) && !world.inWater(nx)) p.x = nx;
    if (!world.collidesBuilding(p.x, ny, 12) && !world.inWater(ny)) p.y = ny;
    p.walkPhase += dt * (sprint ? 13 : 9);
  }
  p.x = Math.max(14, Math.min(world.width - 14, p.x));
  p.y = Math.max(14, Math.min(world.height - 14, p.y));
}
export function createPedestrian(rng, world) {
  // spawn on a sidewalk: near a road edge inside a block grid
  const bx = Math.floor(randRange(rng, 0, 11)) * 300, by = Math.floor(randRange(rng, 0, 8)) * 300;
  const x = bx + 92 + randRange(rng, 0, 190), y = by + (rng() > 0.5 ? 92 : 292 - 8);
  return { x, y, angle: randRange(rng, 0, 6.28), speed: randRange(rng, 32, 58), health: 30, state: 'stroll', fleeT: 0, shirt: pick(rng, SHIRTS), wantsTaxi: rng() < 0.16, dead: false, target: null, phase: randRange(rng, 0, 6) };
}
export function updatePedestrian(ped, dt, danger, world) {
  if (ped.dead) return;
  ped.phase += dt * 6;
  if (danger && Math.hypot(danger.x - ped.x, danger.y - ped.y) < 190) { ped.state = 'flee'; ped.fleeT = 1.6; }
  if (ped.fleeT > 0) ped.fleeT -= dt; else if (ped.state === 'flee') ped.state = 'stroll';
  if (ped.state === 'flee' && danger) {
    ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    stepPed(ped, 150, dt, world);
  } else if (ped.wantsTaxi) {
    // stand still waving
  } else {
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 14) {
      ped.target = { x: ped.x + randRange(Math.random, -160, 160), y: ped.y + randRange(Math.random, -40, 40) };
    }
    ped.angle = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    stepPed(ped, ped.speed, dt, world);
  }
}
function stepPed(ped, sp, dt, world) {
  const nx = ped.x + Math.cos(ped.angle) * sp * dt, ny = ped.y + Math.sin(ped.angle) * sp * dt;
  if (!world.collidesBuilding(nx, ny, 10) && !world.inWater(nx)) { ped.x = nx; ped.y = ny; }
  else ped.angle += 1.9 * dt + 0.4;
  ped.x = Math.max(10, Math.min(world.width - 10, ped.x));
  ped.y = Math.max(10, Math.min(world.height - 10, ped.y));
}
