// Palm City Heat — tuning constants, colours and tables in one place.
export const STEP = 1 / 60;
export const WORLD = { width: 3600, height: 2600, block: 300, road: 84, sidewalk: 16 };
export const BEACH_X = 3120;
export const PLAYER_CFG = { radius: 13, walk: 150, sprint: 250, health: 100, armorMax: 100 };
export const SAVE_KEY = 'palm-city-heat.save.v1';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const PALETTE = {
  sky: '#2b1d33', grass: '#3f7d4a', sand: '#e8c87a', water: '#1f6f8b', water2: '#2a9db8',
  road: '#3a3a42', roadLine: '#f2d06b', sidewalk: '#b8a898', curb: '#8a7f72',
  text: '#fff6e8', muted: '#c9b8a8', accent: '#ffb347', danger: '#ff5a5a', good: '#7dff9a',
  panel: 'rgba(24,16,28,0.88)', panelEdge: '#ffb347',
};
export const DISTRICTS = [
  { name: 'Downtown Palms', x0: 0, y0: 0, x1: 1500, y1: 1300, ground: '#c9a06a', roof: ['#e07a5f', '#f2cc8f', '#81b29a', '#e8a87c'] },
  { name: 'Marina Bay', x0: 1500, y0: 0, x1: 3600, y1: 1100, ground: '#d9b878', roof: ['#f4f1de', '#e07a5f', '#3d8bfd', '#f2cc8f'] },
  { name: 'Sunset Strip', x0: 0, y0: 1300, x1: 1800, y1: 2600, ground: '#b98a5e', roof: ['#ff8fab', '#ffc2d1', '#e07a5f', '#f2cc8f'] },
  { name: 'Harbor Yards', x0: 1800, y0: 1100, x1: 3600, y1: 2600, ground: '#9a8a72', roof: ['#6c757d', '#adb5bd', '#e07a5f', '#81b29a'] },
];
export const CAR_MODELS = [
  { name: 'Sunny Cab', w: 44, h: 22, accel: 260, top: 340, color: '#f2c94c', grip: 3.2 },
  { name: 'Coast Cruiser', w: 48, h: 23, accel: 300, top: 380, color: '#e07a5f', grip: 3.4 },
  { name: 'Palm Runner', w: 46, h: 21, accel: 340, top: 430, color: '#3d8bfd', grip: 3.6 },
  { name: 'Bay Van', w: 52, h: 25, accel: 220, top: 300, color: '#81b29a', grip: 3.0 },
  { name: 'Night Viper', w: 47, h: 21, accel: 380, top: 470, color: '#22223a', grip: 3.8 },
  { name: 'Cop Interceptor', w: 48, h: 23, accel: 330, top: 420, color: '#f4f1de', grip: 3.6 },
];
export const WEAPONS = {
  fists: { name: 'Fists', damage: 14, range: 34, cooldown: 0.32 },
  pistol: { name: 'Pistol', damage: 34, range: 420, cooldown: 0.24 },
};
export const WANTED_CFG = { decayDelay: 7, decayEvery: 6, bustedRange: 95, bustedRate: 0.6 };
