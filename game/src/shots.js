// Deterministic screenshot scenes behind ?shot=<scene>: pose the real game state richly.
import { createCar } from './vehicles.js';
// scenes: cover (title over downtown), onfoot, chase, mission
export function stageShot(name, game) {
  const p = game.player;
  if (name === 'cover') {
    game.state = 'title';
    p.x = 640; p.y = 480; p.car = null;
    game.camera.x = 640; game.camera.y = 430;
    return;
  }
  if (name === 'onfoot') {
    game.state = 'play';
    p.x = 655; p.y = 470; p.car = null; p.angle = 0.6; p.health = 82; p.armor = 35;
    game.money = 1250; game.respect = 22;
    game.objective = 'Meet Rosa at the Marina — press F at the gold marker';
    game.marker = { x: 880, y: 380 };
    game.camera.x = 655; game.camera.y = 470;
    return;
  }
  if (name === 'chase') {
    game.state = 'play';
    const car = game.allCars.find((c) => !c.police && !c.parked) || game.allCars[0];
    car.x = 642; car.y = 342; car.angle = 0; car.vx = 300; car.vy = 12;
    p.car = car; car.driver = 'player'; p.x = car.x; p.y = car.y;
    game.wanted.stars = 3; game.money = 2480; game.respect = 47; p.health = 64;
    game.combat.hasPistol = true; game.combat.weapon = 'pistol'; game.combat.ammo = 18;
    game.objective = 'Escape the police — break their line of sight!';
    game.marker = { x: 342, y: 2242 };
    for (let i = 0; i < 3; i++) {
      const pc = createCar(470 - i * 105, 330 + i * 22, 0.06 * i, 5, { driver: 'police', police: true });
      pc.vx = 280; game.policeCars.push(pc); game.allCars.push(pc);
    }
    car.skid = 1;
    game.skids.push({ x1: 430, y1: 350, x2: 600, y2: 346, t: 8 }, { x1: 430, y1: 364, x2: 600, y2: 360, t: 8 });
    game.camera.x = 660; game.camera.y = 360;
    return;
  }
  // mission
  game.state = 'play';
  p.x = 900; p.y = 360; p.car = null; p.health = 91;
  game.money = 860; game.respect = 12; game.wanted.stars = 1;
  game.missions.dialogue = 'Rosa: Benny left a package at the hospital. Get it to the Marina — fast. The clock is ticking!';
  game.missions.dialogueT = 99;
  game.objective = 'Mission: Hot Package — deliver to the Marina (1,840m)';
  game.timerText = '01:12'; game.marker = { x: 980, y: 330 };
  game.camera.x = 900; game.camera.y = 370;
}
