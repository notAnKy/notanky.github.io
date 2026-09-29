import './style.css';
import { Save } from './core/Save';
import { UI } from './ui/UI';
import { Game } from './core/Game';

const save = new Save();
const ui = new UI(save);
const enter = document.querySelector<HTMLButtonElement>('#enter')!;
enter.disabled = true;
enter.setAttribute('aria-busy', 'true');
async function startWorld() {
try {
  await document.fonts.load('700 100px Rajdhani').catch(() => []);
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
  new Game(ui, save);
} catch (error) {
  console.warn('3D world unavailable; opening accessible portfolio.', error);
  ui.showFallback();
} finally {
  enter.disabled = false;
  enter.removeAttribute('aria-busy');
}
}
void startWorld();
