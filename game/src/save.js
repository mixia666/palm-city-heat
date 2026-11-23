// localStorage save: money, respect, story progress, weapon and position.
import { SAVE_KEY } from './config.js';
export function loadSave() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function hasSave() { return loadSave() !== null; }
export function writeSave(data) { try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage off */ } }
export function clearSave() { try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
export function makeSave(game) {
  return { money: game.money, respect: game.respect, storyIndex: game.missions.storyIndex, storyDone: game.missions.storyDone, hasPistol: game.combat.hasPistol, ammo: game.combat.ammo, x: Math.round(game.player.x), y: Math.round(game.player.y) };
}
