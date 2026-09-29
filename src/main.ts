import './style.css';
import { Save } from './core/Save';
import { UI } from './ui/UI';
import { Game } from './core/Game';

const save = new Save();
const ui = new UI(save);
try {
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
  new Game(ui, save);
} catch (error) {
  console.warn('3D world unavailable; opening accessible portfolio.', error);
  ui.showFallback();
}
