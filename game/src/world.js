// City generation for Palm City: road grid, blocks, named buildings, beach, palms and props.
import { WORLD, DISTRICTS, BEACH_X } from './config.js';
import { randRange, randInt, pick } from './random.js';

const BUILDING_NAMES = ['Palm Plaza Hotel', 'Coral Bank', 'Sunset Diner', 'Marina Suites', 'Bay Records', 'Tropic Arcade', 'Harbor Motors', 'Neon Noodle Bar', 'Vista Cinema', 'Palmetto Gym', 'Seabreeze Pharmacy', 'Golden Anchor Inn', 'Flamingo Lounge', 'Coconut Mall', 'Pier 9 Gallery', 'Sun Taxi Depot', 'Repaint Garage', 'Safehouse Lofts', 'Marina Dock Office', 'Palm City Hospital'];
export const GARAGE_POS = { x: 642, y: 642 };
export const HOSPITAL_POS = { x: 942, y: 342 };
export const MARINA_POS = { x: 3042, y: 342 };
export const HIDEOUT_POS = { x: 342, y: 2242 };

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  return DISTRICTS[0];
}
export function roadCenters() {
  const c = [];
  for (let v = WORLD.road / 2; v < WORLD.width; v += WORLD.block) c.push(v);
  return c;
}
export function isOnRoad(x, y) {
  const mx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const my = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  return mx < WORLD.road || my < WORLD.road;
}
export function nearestRoadPoint(x, y) {
  const bx = Math.round((x - WORLD.road / 2) / WORLD.block) * WORLD.block + WORLD.road / 2;
  const by = Math.round((y - WORLD.road / 2) / WORLD.block) * WORLD.block + WORLD.road / 2;
  return Math.abs(x - bx) < Math.abs(y - by) ? { x: bx, y } : { x, y: by };
}
export function createWorld(rng) {
  const buildings = [], palms = [], props = [], lamps = [];
  let nameIdx = 0;
  for (let bx = 0; bx < WORLD.width; bx += WORLD.block) {
    for (let by = 0; by < WORLD.height; by += WORLD.block) {
      if (bx + WORLD.road >= BEACH_X) continue;
      const inset = WORLD.road + 14;
      const bw = WORLD.block - WORLD.road - 28;
      const d = districtAt(bx + WORLD.block / 2, by + WORLD.block / 2);
      // 1-2 buildings per block
      const tall = rng() > 0.45;
      buildings.push({ x: bx + inset, y: by + inset, w: bw * (tall ? 0.62 : 1), h: bw * (tall ? 1 : 0.55), color: pick(rng, d.roof), name: BUILDING_NAMES[nameIdx++ % BUILDING_NAMES.length], floors: randInt(rng, 2, 9) });
      if (!tall) buildings.push({ x: bx + inset, y: by + inset + bw * 0.6, w: bw, h: bw * 0.36, color: pick(rng, d.roof), name: '', floors: 1 });
      for (let i = 0; i < 3; i++) palms.push({ x: bx + WORLD.road + randRange(rng, 4, 20), y: by + randRange(rng, 20, WORLD.block - 20), s: randRange(rng, 0.8, 1.3) });
      if (rng() > 0.5) props.push({ x: bx + inset + randRange(rng, 0, bw - 20), y: by + inset + randRange(rng, 0, bw - 20), kind: pick(rng, ['crate', 'bench', 'hydrant', 'bin']), r: 9 });
      lamps.push({ x: bx + WORLD.road - 6, y: by + WORLD.road - 6 });
    }
  }
  // beach palms
  for (let i = 0; i < 40; i++) palms.push({ x: randRange(rng, BEACH_X - 90, BEACH_X + 30), y: randRange(rng, 20, WORLD.height - 20), s: randRange(rng, 0.9, 1.5) });
  const specials = [
    { ...GARAGE_POS, label: 'REPAINT GARAGE', color: '#3d8bfd' },
    { ...HOSPITAL_POS, label: 'HOSPITAL', color: '#f4f1de' },
    { ...MARINA_POS, label: 'MARINA', color: '#2a9db8' },
    { ...HIDEOUT_POS, label: 'HIDEOUT', color: '#81b29a' },
  ];
  function collidesBuilding(x, y, r) {
    for (const b of buildings) if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    return null;
  }
  function inWater(x) { return x > BEACH_X + 120; }
  return { buildings, palms, props, lamps, specials, collidesBuilding, inWater, width: WORLD.width, height: WORLD.height };
}
