// Combat: fists and pistol, health and armor, bullets, muzzle flash and hit effects.
import { WEAPONS } from './config.js';
export function createCombatState() { return { weapon: 'fists', ammo: 0, hasPistol: false, bullets: [], muzzle: 0, shake: 0 }; }
export function damagePlayer(player, amount) {
  if (player.armor > 0) { const absorbed = Math.min(player.armor, amount * 0.7); player.armor -= absorbed; amount -= absorbed; }
  player.health -= amount; player.hurtT = 0.35;
  if (player.health <= 0) { player.health = 0; player.dead = true; }
}
export function tryAttack(state, player, aimAngle, targets, fx) {
  if (player.attackCd > 0) return null;
  const w = WEAPONS[state.weapon];
  player.attackCd = w.cooldown;
  if (state.weapon === 'pistol') {
    if (state.ammo <= 0) { state.weapon = 'fists'; return 'click'; }
    state.ammo -= 1; state.muzzle = 0.07;
    state.bullets.push({ x: player.x + Math.cos(aimAngle) * 18, y: player.y + Math.sin(aimAngle) * 18, vx: Math.cos(aimAngle) * 900, vy: Math.sin(aimAngle) * 900, life: 0.5 });
    fx.push({ kind: 'flash', x: player.x + Math.cos(aimAngle) * 24, y: player.y + Math.sin(aimAngle) * 24, t: 0.07, max: 0.07 });
    return 'shot';
  }
  // fists: hit nearest target in range in aim direction
  let best = null, bestD = w.range;
  for (const t of targets) { if (t.dead) continue; const d = Math.hypot(t.x - player.x, t.y - player.y); if (d < bestD) { best = t; bestD = d; } }
  if (best) { best.health -= w.damage; fx.push({ kind: 'spark', x: best.x, y: best.y, t: 0.25, max: 0.25, color: '#ffd166' }); if (best.health <= 0) best.dead = true; return 'hitPed'; }
  return 'swing';
}
export function updateBullets(state, dt, world, targets, fx) {
  const hits = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (world.collidesBuilding(b.x, b.y, 2)) { b.life = 0; fx.push({ kind: 'spark', x: b.x, y: b.y, t: 0.2, max: 0.2, color: '#fff' }); continue; }
    for (const t of targets) {
      if (t.dead) continue;
      if (Math.hypot(t.x - b.x, t.y - b.y) < 16) { t.health -= WEAPONS.pistol.damage; b.life = 0; fx.push({ kind: 'spark', x: t.x, y: t.y, t: 0.3, max: 0.3, color: '#ff5a5a' }); if (t.health <= 0) { t.dead = true; hits.push(t); } break; }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  if (state.muzzle > 0) state.muzzle -= dt;
  return hits;
}
