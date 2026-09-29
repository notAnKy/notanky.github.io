import type { DriveInput } from '../vehicle/Rover';

export class Input {
  drive: DriveInput = { forward: false, reverse: false, left: false, right: false, brake: false, boost: false };
  private keys = new Set<string>();
  private mobile = new Set<string>();
  enabled = false;
  onInteract = () => {};
  onMap = () => {};
  onReset = () => {};
  onEscape = () => {};

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat && ['e', 'm', 'r', 'escape'].includes(e.key.toLowerCase())) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key) && this.enabled && !this.typing()) e.preventDefault();
      if (this.typing()) return;
      this.keys.add(key); this.refresh();
      if (key === 'm') { this.onMap(); return; }
      if (key === 'escape') { this.onEscape(); return; }
      if (!this.enabled) return;
      if (key === 'e') this.onInteract();
      if (key === 'r') this.onReset();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); this.refresh(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mobile.clear(); this.refresh(); });
    document.querySelectorAll<HTMLElement>('[data-drive]').forEach(button => {
      const action = button.dataset.drive!;
      button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); this.mobile.add(action); this.refresh(); });
      const release = () => { this.mobile.delete(action); this.refresh(); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    });
  }
  private typing() { const target = document.activeElement; return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement; }
  clear() { this.keys.clear(); this.mobile.clear(); this.refresh(); }
  private refresh() {
    const has = (keys: string[], action: string) => this.mobile.has(action) || keys.some(key => this.keys.has(key));
    this.drive.forward = has(['w', 'arrowup'], 'forward');
    this.drive.reverse = has(['s', 'arrowdown'], 'reverse');
    this.drive.left = has(['a', 'arrowleft'], 'left');
    this.drive.right = has(['d', 'arrowright'], 'right');
    this.drive.brake = has([' '], 'brake');
    this.drive.boost = has(['shift'], 'boost');
  }
}
