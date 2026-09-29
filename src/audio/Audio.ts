export class AudioEngine {
  private context?: AudioContext;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  enabled = false;
  setEnabled(value: boolean) {
    this.enabled = value;
    if (value) {
      this.context ??= new AudioContext();
      if (!this.oscillator) {
        this.oscillator = this.context.createOscillator(); this.gain = this.context.createGain();
        this.oscillator.type = 'sawtooth'; this.oscillator.frequency.value = 45;
        this.gain.gain.value = 0; this.oscillator.connect(this.gain); this.gain.connect(this.context.destination); this.oscillator.start();
      }
      void this.context.resume();
    } else if (this.gain && this.context) this.gain.gain.setTargetAtTime(0, this.context.currentTime, .08);
  }
  update(speed: number, active: boolean) {
    if (!this.enabled || !this.context || !this.oscillator || !this.gain) return;
    this.oscillator.frequency.setTargetAtTime(38 + Math.abs(speed) * 4, this.context.currentTime, .12);
    this.gain.gain.setTargetAtTime(active ? Math.min(.018 + Math.abs(speed) * .0009, .035) : 0, this.context.currentTime, .13);
  }
  chirp(frequency = 520) {
    if (!this.enabled || !this.context) return;
    const o = this.context.createOscillator(), g = this.context.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(frequency, this.context.currentTime); o.frequency.exponentialRampToValueAtTime(frequency * 1.4, this.context.currentTime + .12);
    g.gain.setValueAtTime(.045, this.context.currentTime); g.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .15);
    o.connect(g); g.connect(this.context.destination); o.start(); o.stop(this.context.currentTime + .16);
  }
}
