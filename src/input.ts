const keys = new Set<string>();
const edges = new Set<string>();
const gameKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyA',
  'KeyD', 'KeyW', 'KeyS', 'KeyE', 'KeyF', 'Escape', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2',
  'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyR', 'KeyQ', 'KeyG', 'KeyM', 'KeyP']);
export const held = (...codes: string[]) => codes.some(code => keys.has(code));
export const tap = (...codes: string[]) => codes.some(code => edges.has(code));
export const clearEdges = () => edges.clear();
export function resetInput() { keys.clear(); edges.clear(); }

export function startInput(engaged: () => boolean) {
  window.addEventListener('keydown', e => {
    if (!gameKeys.has(e.code)) return;
    if (engaged() && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    if (!e.repeat && !(e.target instanceof HTMLInputElement)) edges.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', resetInput);
}
