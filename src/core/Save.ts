export type Quality = 'low' | 'medium' | 'high';
export type SaveData = { visited: string[]; discovered: string[]; tokens: number[]; quality: Quality | 'auto'; audio: boolean };
const KEY = 'build-world-v1';
const defaults: SaveData = { visited: [], discovered: [], tokens: [], quality: 'auto', audio: false };
export class Save {
  data: SaveData;
  constructor() {
    try { this.data = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
    catch { this.data = { ...defaults }; }
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private browsing */ } }
  visit(id: string) { if (!this.data.visited.includes(id)) { this.data.visited.push(id); this.persist(); return true; } return false; }
  discover(id: string) { if (!this.data.discovered.includes(id)) { this.data.discovered.push(id); this.persist(); } }
  token(id: number) { if (!this.data.tokens.includes(id)) { this.data.tokens.push(id); this.persist(); return true; } return false; }
  reset() { this.data = { ...this.data, visited: [], discovered: [], tokens: [] }; this.persist(); }
  get percentage() { return Math.round((this.data.visited.length / 7 * .7 + this.data.discovered.length / 12 * .3) * 100); }
}
