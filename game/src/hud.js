// HUD drawing: bars, money, stars, weapon, objective, dialogue, minimap, menus and popups.
import { FONT, PALETTE, WORLD } from './config.js';
export function drawBar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
}
export function drawStars(ctx, x, y, stars, flash) {
  ctx.font = `22px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < stars ? (flash && Math.floor(performance.now() / 300) % 2 ? '#fff' : '#ffd166') : 'rgba(255,255,255,0.25)'; ctx.fillText('★', x + i * 24, y); }
}
export function drawMinimap(ctx, x, y, size, game) {
  const s = size / WORLD.width, sy = size / (WORLD.width) * (WORLD.height / WORLD.width);
  ctx.save();
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(x, y, size, size * WORLD.height / WORLD.width);
  ctx.fillStyle = '#2a9db8'; ctx.fillRect(x + 3120 * s, y, size - 3120 * s, size * WORLD.height / WORLD.width);
  ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = Math.max(1, 84 * s);
  for (let v = 42; v < WORLD.width; v += 300) { ctx.beginPath(); ctx.moveTo(x + v * s, y); ctx.lineTo(x + v * s, y + size * WORLD.height / WORLD.width); ctx.stroke(); }
  for (let h = 42; h < WORLD.height; h += 300) { ctx.beginPath(); ctx.moveTo(x, y + h * sy * (WORLD.width / WORLD.height) * 0 + h * s); ctx.lineTo(x + size, y + h * s); ctx.stroke(); }
  const dot = (wx, wy, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + wx * s, y + wy * s, r || 3, 0, 6.29); ctx.fill(); };
  for (const c of game.traffic) dot(c.x, c.y, '#e8e0d0', 2);
  for (const c of game.policeCars) dot(c.x, c.y, Math.floor(performance.now() / 300) % 2 ? '#ff5a5a' : '#3d8bfd', 3.5);
  if (game.marker) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); const mx = x + game.marker.x * s, my = y + game.marker.y * s; ctx.arc(mx, my, 5 + Math.sin(performance.now() / 200) * 1.5, 0, 6.29); ctx.fill(); }
  // player arrow
  const px = x + game.playerPos.x * s, py = y + game.playerPos.y * s;
  ctx.translate(px, py); ctx.rotate(game.playerAngle); ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size * WORLD.height / WORLD.width);
}
export function drawPanel(ctx, W, H, title, lines, accent) {
  const w = Math.min(680, W - 60), lineH = 30, h = 120 + lines.length * lineH;
  const x = (W - w) / 2, y = (H - h) / 2;
  ctx.fillStyle = 'rgba(10,6,14,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.panel; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || PALETTE.panelEdge; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = accent || PALETTE.accent; ctx.font = `bold 40px ${FONT}`; ctx.fillText(title, W / 2, y + 22);
  ctx.fillStyle = PALETTE.text; ctx.font = `19px ${FONT}`;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + 84 + i * lineH));
}
export function drawHud(ctx, W, H, game) {
  ctx.textBaseline = 'top';
  drawBar(ctx, 16, 16, 210, 16, game.player.health / 100, '#ff5a5a');
  drawBar(ctx, 16, 36, 210, 10, game.player.armor / 100, '#7ec8ff');
  ctx.fillStyle = '#fff'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('HEALTH', 18, 17);
  ctx.font = `bold 26px ${FONT}`; ctx.fillStyle = '#7dff9a'; ctx.fillText('$' + game.money, 16, 56);
  ctx.font = `16px ${FONT}`; ctx.fillStyle = PALETTE.text; ctx.fillText('Respect ' + game.respect, 16, 88);
  ctx.fillText(game.combat.hasPistol ? (game.combat.weapon === 'pistol' ? `Pistol — ${game.combat.ammo} rounds (Q to swap)` : 'Fists (Q for Pistol)') : 'Fists', 16, 110);
  drawStars(ctx, W - 150, 14, game.wanted.stars, game.wanted.crimeFlash > 0);
  if (game.wanted.busted > 0.02) { ctx.fillStyle = '#fff'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText('CAUGHT?', W - 16, 46); drawBar(ctx, W - 216, 66, 200, 12, game.wanted.busted, '#ff5a5a'); }
  // objective top-center
  if (game.objective) {
    ctx.font = `bold 18px ${FONT}`; const tw = ctx.measureText(game.objective).width + 28;
    ctx.fillStyle = 'rgba(10,6,14,0.65)'; ctx.fillRect((W - tw) / 2, 12, tw, 34);
    ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'; ctx.fillText(game.objective, W / 2, 20);
  }
  if (game.timerText) { ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = game.timerUrgent ? '#ff5a5a' : '#fff'; ctx.textAlign = 'center'; ctx.fillText(game.timerText, W / 2, 52); }
  if (game.dialogue) {
    ctx.fillStyle = 'rgba(10,6,14,0.78)'; ctx.fillRect(60, H - 118, W - 120, 66);
    ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 1.5; ctx.strokeRect(60, H - 118, W - 120, 66);
    ctx.fillStyle = PALETTE.text; ctx.font = `18px ${FONT}`; ctx.textAlign = 'left';
    wrapText(ctx, game.dialogue, 78, H - 104, W - 156, 24);
  }
  if (game.message) { ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#7dff9a'; ctx.textAlign = 'center'; ctx.fillText(game.message, W / 2, H - 170); }
  if (game.districtPopup > 0) { ctx.font = `bold 34px ${FONT}`; ctx.fillStyle = 'rgba(255,246,232,0.95)'; ctx.textAlign = 'center'; ctx.fillText(game.districtName, W / 2, 110); }
  if (game.prompt) { ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = '#ffd166'; ctx.textAlign = 'center'; ctx.fillText(game.prompt, W / 2, H - 60); }
  drawMinimap(ctx, W - 196, H - 168, 180, game);
}
export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' '); let line = '', yy = y;
  for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); yy += lineH; line = wd; } else line = test; }
  ctx.fillText(line, x, yy);
}
