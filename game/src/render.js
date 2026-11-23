// Rendering: camera with lookahead, city, beach, cars, people, effects and sunset light.
import { FONT, PALETTE, WORLD, BEACH_X, CAR_MODELS } from './config.js';
export const SCREEN_TITLE = 'title'; export const SCREEN_PLAY = 'play'; export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over'; export const SCREEN_BUSTED = 'busted'; export const SCREEN_COMPLETE = 'complete'; export const SCREEN_STORYDONE = 'storydone';
export function createCamera() { return { x: 600, y: 300, shakeX: 0, shakeY: 0 }; }
export function updateCamera(cam, target, vel, dt, W, H) {
  const lookX = target.x + (vel ? vel.x * 0.55 : 0), lookY = target.y + (vel ? vel.y * 0.55 : 0);
  cam.x += (lookX - cam.x) * Math.min(1, dt * 4.5); cam.y += (lookY - cam.y) * Math.min(1, dt * 4.5);
  cam.x = Math.max(W / 2 - 60, Math.min(WORLD.width - W / 2 + 60, cam.x));
  cam.y = Math.max(H / 2 - 60, Math.min(WORLD.height - H / 2 + 60, cam.y));
}
export function drawWorld(ctx, game, cam, W, H, time) {
  const left = cam.x - W / 2 - 40, top = cam.y - H / 2 - 40, right = cam.x + W / 2 + 40, bot = cam.y + H / 2 + 40;
  ctx.save(); ctx.translate(W / 2 - cam.x + cam.shakeX, H / 2 - cam.y + cam.shakeY);
  // ground per district base
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(left, top, right - left, bot - top);
  ctx.fillStyle = '#b98a5e'; ctx.fillRect(left, Math.max(top, 1300), right - left, bot - Math.max(top, 1300));
  // beach + water
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(BEACH_X - 110, top, 150, bot - top);
  ctx.fillStyle = PALETTE.water; ctx.fillRect(BEACH_X + 40, top, right - BEACH_X, bot - top);
  ctx.fillStyle = PALETTE.water2;
  for (let y = Math.floor(top / 90) * 90; y < bot; y += 90) { ctx.globalAlpha = 0.35; ctx.fillRect(BEACH_X + 60 + Math.sin(time * 1.4 + y) * 14, y, 130, 7); }
  ctx.globalAlpha = 1;
  // blocks ground tint + sidewalks
  for (let bx = Math.floor(left / 300) * 300; bx < right; bx += 300) for (let by = Math.floor(top / 300) * 300; by < bot; by += 300) {
    ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(bx + 84, by + 84, 216, 216);
  }
  // roads
  ctx.fillStyle = PALETTE.road;
  for (let v = 0; v < WORLD.width; v += 300) ctx.fillRect(v, top, 84, bot - top);
  for (let h = 0; h < WORLD.height; h += 300) ctx.fillRect(left, h, right - left, 84);
  ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
  for (let v = 42; v < WORLD.width; v += 300) { ctx.beginPath(); ctx.moveTo(v, top); ctx.lineTo(v, bot); ctx.stroke(); }
  for (let h = 42; h < WORLD.height; h += 300) { ctx.beginPath(); ctx.moveTo(left, h); ctx.lineTo(right, h); ctx.stroke(); }
  ctx.setLineDash([]);
  // skid marks
  ctx.strokeStyle = 'rgba(20,16,20,0.5)'; ctx.lineWidth = 4;
  for (const s of game.skids) { ctx.globalAlpha = Math.min(0.6, s.t / 8); ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // marker beacon
  if (game.marker) { const m = game.marker; ctx.fillStyle = 'rgba(255,209,102,0.25)'; ctx.beginPath(); ctx.arc(m.x, m.y, 30 + Math.sin(time * 5) * 5, 0, 6.29); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, 6.29); ctx.fill(); ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('▼', m.x, m.y - 52 + Math.sin(time * 5) * 5); }
  // buildings with shadow + signs
  for (const b of game.world.buildings) {
    if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bot) continue;
    ctx.fillStyle = 'rgba(40,20,30,0.35)'; ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(b.x, b.y, b.w, 8);
    ctx.fillStyle = 'rgba(30,20,40,0.55)';
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) if ((cx * 7 + ry * 13 + b.floors) % 3) ctx.fillRect(b.x + 8 + cx * 24, b.y + 12 + ry * 24, 11, 9);
    if (b.name) { ctx.fillStyle = 'rgba(20,12,20,0.8)'; const tw = Math.min(b.w, ctx.measureText(b.name).width + 14); ctx.font = `bold 11px ${FONT}`; ctx.fillRect(b.x + (b.w - tw) / 2, b.y - 2, tw, 17); ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'; ctx.fillText(b.name, b.x + b.w / 2, b.y + 1); }
  }
  for (const sp of game.world.specials) { ctx.fillStyle = sp.color; ctx.fillRect(sp.x - 34, sp.y - 14, 68, 28); ctx.fillStyle = '#1c1420'; ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(sp.label, sp.x, sp.y - 3); }
  for (const pr of game.world.props) { if (pr.x < left || pr.x > right || pr.y < top || pr.y > bot) continue; ctx.fillStyle = pr.kind === 'hydrant' ? '#e5534b' : pr.kind === 'bench' ? '#8a5a2b' : '#6c757d'; ctx.fillRect(pr.x - pr.r, pr.y - pr.r, pr.r * 2, pr.r * 1.4); }
  for (const pm of game.world.palms) { if (pm.x < left || pm.x > right || pm.y < top || pm.y > bot) continue; drawPalm(ctx, pm.x, pm.y, pm.s); }
  // cars
  for (const car of game.allCars) drawCar(ctx, car, time);
  // peds
  for (const ped of game.peds) { if (ped.x < left || ped.x > right || ped.y < top || ped.y > bot) continue; drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.phase, ped.dead, ped.wantsTaxi); }
  // player
  if (!game.player.car) drawPerson(ctx, game.player.x, game.player.y, game.player.angle, '#ffd166', game.player.walkPhase, game.player.dead, false, true);
  // bullets + fx
  ctx.fillStyle = '#ffe9a8'; for (const b of game.combat.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 6.29); ctx.fill(); }
  for (const f of game.fx) { const a = Math.max(0, f.t / f.max); ctx.globalAlpha = a; ctx.fillStyle = f.color || '#ffb347'; ctx.beginPath(); ctx.arc(f.x, f.y, (1 - a) * 20 + 4, 0, 6.29); ctx.fill(); }
  ctx.globalAlpha = 1;
  // smoke
  for (const p of game.particles) { ctx.globalAlpha = Math.max(0, p.t / p.max) * 0.5; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // sunset wash + vignette
  const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(255,140,60,0.10)'); grad.addColorStop(0.6, 'rgba(255,90,120,0.05)'); grad.addColorStop(1, 'rgba(30,10,50,0.16)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  if (game.player.hurtT > 0) { ctx.fillStyle = `rgba(255,40,40,${game.player.hurtT * 0.35})`; ctx.fillRect(0, 0, W, H); }
}
export function drawPalm(ctx, x, y, s) {
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4 * s, y - 14 * s, x + 9 * s, y - 24 * s); ctx.stroke();
  ctx.strokeStyle = '#2e9e5b'; ctx.lineWidth = 3.4 * s;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + 0.4; ctx.beginPath(); ctx.moveTo(x + 9 * s, y - 24 * s); ctx.quadraticCurveTo(x + 9 * s + Math.cos(a) * 15 * s, y - 24 * s + Math.sin(a) * 9 * s - 4, x + 9 * s + Math.cos(a) * 24 * s, y - 24 * s + Math.sin(a) * 15 * s + 6 * s); ctx.stroke(); }
}
export function drawPerson(ctx, x, y, angle, shirt, phase, dead, taxi, isPlayer) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,15,25,0.3)'; ctx.beginPath(); ctx.ellipse(0, 5, 11, 5, 0, 0, 6.29); ctx.fill();
  if (dead) { ctx.rotate(1.4); ctx.fillStyle = '#5a4a52'; ctx.fillRect(-11, -5, 22, 10); ctx.restore(); return; }
  const bob = Math.sin(phase || 0) * 1.6;
  ctx.fillStyle = '#2b2b3a'; ctx.fillRect(-7, 2 + Math.abs(bob), 5, 8); ctx.fillRect(2, 2 - Math.abs(bob), 5, 8);
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.arc(0, bob * 0.4, 9, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3 + bob * 0.4, 5, 0, 6.29); ctx.fill();
  if (isPlayer) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.29); ctx.stroke(); }
  if (taxi) { ctx.fillStyle = '#ffd166'; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', 0, -26 + Math.sin(performance.now() / 250) * 3); }
  ctx.restore();
}
export function drawCar(ctx, car, time) {
  const m = CAR_MODELS[car.model];
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(25,12,22,0.4)'; ctx.fillRect(-car.w / 2 + 5, -car.h / 2 + 6, car.w, car.h);
  ctx.fillStyle = car.dead ? '#444' : m.color; roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
  if (car.police) { ctx.fillStyle = '#22223a'; ctx.fillRect(-8, -car.h / 2, 17, car.h); ctx.fillStyle = Math.floor(time * 4) % 2 ? '#ff5a5a' : '#3d8bfd'; ctx.fillRect(-3, -6, 7, 12); ctx.fillStyle = '#fff'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, -car.h / 2 - 3); }
  ctx.fillStyle = '#bfe8ff'; ctx.fillRect(2, -car.h / 2 + 4, 11, car.h - 8); ctx.fillRect(-car.w / 2 + 5, -car.h / 2 + 4, 8, car.h - 8);
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 3, 3, 5); ctx.fillRect(car.w / 2 - 3, car.h / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(-car.w / 2, -car.h / 2 + 3, 3, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 8, 3, 5);
  if (car.health < 45) { ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(-6, 0, 9, 0, 6.29); ctx.fill(); }
  ctx.restore();
  if (car.isTarget) { ctx.fillStyle = '#ff5a5a'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('▼', car.x, car.y - 42 + Math.sin(time * 6) * 4); }
}
export function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
