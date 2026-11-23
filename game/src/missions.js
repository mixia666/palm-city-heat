// Story missions, taxi fares and street races for Palm City Heat.
// Characters: Rosa Delgado (fixer), Marco Vale (chop-shop owner), Captain Ana Ruiz (rival), Benny Cole (old friend).
import { GARAGE_POS, MARINA_POS, HIDEOUT_POS } from './world.js';
export const STORY = [
  { id: 'm1', giver: 'Rosa Delgado', title: 'Hot Package', brief: 'Rosa: Benny left a package at the hospital. Get it to the Marina — fast.', type: 'deliver', from: { x: 942, y: 342 }, to: { x: 3042, y: 342 }, time: 75, cash: 300, respect: 10, crime: false },
  { id: 'm2', giver: 'Marco Vale', title: 'Borrowed Wheels', brief: 'Marco: A blue Palm Runner downtown has my name on it. Bring it to my Repaint Garage.', type: 'stealCar', target: { x: 342, y: 342 }, to: GARAGE_POS, time: 0, cash: 450, respect: 14, crime: true },
  { id: 'm3', giver: 'Rosa Delgado', title: 'Runaway Benny', brief: 'Rosa: Benny panicked and bolted in a van. Chase him down and stop his ride!', type: 'chase', target: { x: 1542, y: 642 }, time: 0, cash: 600, respect: 18, crime: false },
  { id: 'm4', giver: 'Benny Cole', title: 'Ambush Heat', brief: 'Benny: It was a setup — cops everywhere! Lose them and reach the Hideout.', type: 'escape', to: HIDEOUT_POS, stars: 3, time: 0, cash: 800, respect: 24, crime: true },
  { id: 'm5', giver: 'Rosa Delgado', title: 'Last Tide', brief: 'Rosa: Final run. Take the Viper, reach the Marina boat before the clock dies. Do not get caught.', type: 'getaway', to: MARINA_POS, time: 60, cash: 1500, respect: 40, crime: true },
];
export function createMissionState() {
  return { storyIndex: 0, active: null, phase: 0, timer: 0, dialogue: '', dialogueT: 0, objective: '', marker: null, targetCar: null, targetPed: null, taxi: null, race: null, storyDone: false, message: '', messageT: 0 };
}
export function availableStoryMission(ms) { return ms.storyDone ? null : STORY[ms.storyIndex]; }
export function startStoryMission(ms, idx) {
  const def = STORY[idx]; if (!def) return null;
  ms.active = def; ms.phase = 0; ms.timer = def.time || 0;
  ms.dialogue = def.brief; ms.dialogueT = 6;
  if (def.type === 'deliver') { ms.marker = def.from; ms.objective = 'Pick up the package at the Hospital'; }
  else if (def.type === 'stealCar') { ms.marker = def.target; ms.objective = 'Find the marked Palm Runner'; }
  else if (def.type === 'chase') { ms.marker = def.target; ms.objective = 'Chase down and stop the fleeing van'; }
  else if (def.type === 'escape') { ms.marker = def.to; ms.objective = 'Lose the police, then reach the Hideout'; }
  else { ms.marker = def.to; ms.objective = 'Race to the Marina before time runs out'; }
  return def;
}
export function missionRewardText(def) { return `+$${def.cash}  +${def.respect} Respect — ${def.title} complete!`; }
export function startTaxi(ms, ped, dest) { ms.taxi = { ped, dest, phase: 0 }; ms.objective = 'Taxi: drive your passenger to the yellow marker'; ms.marker = dest; }
export function startRace(ms, checkpoints) { ms.race = { checkpoints, idx: 0, timer: 90 }; ms.objective = `Street race: hit checkpoint 1/${checkpoints.length}`; ms.marker = checkpoints[0]; }
export const RACE_CHECKPOINTS = [{ x: 342, y: 342 }, { x: 1542, y: 342 }, { x: 2742, y: 642 }, { x: 1542, y: 1542 }, { x: 342, y: 2242 }];
export const TAXI_DESTS = [{ x: 3042, y: 342 }, { x: 342, y: 2242 }, { x: 2742, y: 1542 }, { x: 642, y: 642 }, { x: 1542, y: 942 }];
