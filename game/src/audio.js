// WebAudio synth: engine, siren, shots, pickups and a warm music loop. No audio files.
export function createAudio() {
  let ctx = null, master = null, muted = false, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, musicT = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 500;
      engineOsc.connect(ef); ef.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      startMusic();
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, slide) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const NOTES = [220, 261.6, 329.6, 392, 329.6, 261.6];
  function startMusic() {
    let step = 0;
    musicT = setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running') return;
      tone(NOTES[step % NOTES.length], 0.5, 'triangle', 0.045);
      if (step % 4 === 0) tone(110, 0.7, 'sine', 0.06);
      step++;
    }, 420);
  }
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    get muted() { return muted; },
    shot() { noise(0.12, 0.3); tone(160, 0.1, 'square', 0.15, -100); },
    punch() { noise(0.06, 0.18); tone(90, 0.08, 'sine', 0.2, -40); },
    pickup() { tone(660, 0.12, 'sine', 0.2); setTimeout(() => tone(990, 0.16, 'sine', 0.2), 70); },
    cash() { tone(880, 0.1, 'triangle', 0.2); setTimeout(() => tone(1320, 0.18, 'triangle', 0.2), 80); },
    crash(big) { noise(big ? 0.3 : 0.15, big ? 0.4 : 0.2); tone(70, 0.2, 'sine', 0.25, -30); },
    sirenLevel(stars) { if (!ctx) return; if (sirenGain) sirenGain.gain.value = muted ? 0 : stars > 0 ? 0.028 : 0; },
    updateEngine(speedRatio, inCar, t) {
      if (!ctx || !engineOsc) return;
      engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 165 + Math.sin(t * 30) * 3;
      if (engineGain) engineGain.gain.value = muted ? 0 : inCar ? 0.05 + Math.abs(speedRatio) * 0.05 : 0;
      if (sirenOsc) sirenOsc.frequency.value = 620 + Math.sin(t * 6) * 180;
    },
  };
}
