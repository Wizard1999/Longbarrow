export interface KeyboardHandlers {
  onKey: (key: string, e: KeyboardEvent) => void;
}

export interface Keyboard {
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
}

export function createKeyboard(handlers: KeyboardHandlers): Keyboard {
  const state: Keyboard = {
    keys: {},
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
  };

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    state.keys[k] = true;
    handlers.onKey(k, e);
  });
  window.addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('mousemove', e => { state.mouseX = e.clientX; state.mouseY = e.clientY; });

  return state;
}
