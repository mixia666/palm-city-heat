// Keyboard and mouse input: held keys, one-shot presses, mouse aim and buttons.
export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
  canvas.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('pointerdown', (e) => { mouse.down = true; mouse.clicked = true; mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  return {
    held, mouse,
    isDown(...codes) { return codes.some((c) => held.has(c)); },
    wasPressed(...codes) { return codes.some((c) => pressed.has(c)); },
    moveAxis() {
      let x = 0, y = 0;
      if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
      if (this.isDown('KeyD', 'ArrowRight')) x += 1;
      if (this.isDown('KeyW', 'ArrowUp')) y -= 1;
      if (this.isDown('KeyS', 'ArrowDown')) y += 1;
      return { x, y };
    },
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}
