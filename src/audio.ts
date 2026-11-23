import type { Settings } from './save.ts';

export class AudioBed {
  private audio?: AudioContext;
  private master?: GainNode;
  private engine?: OscillatorNode;
  private engineGain?: GainNode;
  private siren?: OscillatorNode;
  private sirenGain?: GainNode;
  private nextNote = 0;
  private beat = 0;

  constructor(private settings: Settings) {}

  wake() {
    if (!this.audio) {
      const a = this.audio = new AudioContext();
      const m = this.master = a.createGain();
      m.connect(a.destination);
      this.engine = a.createOscillator();
      this.engine.type = 'triangle';
      this.engineGain = a.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain).connect(m);
      this.engine.start();
      this.siren = a.createOscillator();
      this.siren.type = 'sine';
      this.sirenGain = a.createGain();
      this.sirenGain.gain.value = 0;
      this.siren.connect(this.sirenGain).connect(m);
      this.siren.start();
    }
    if (this.audio.state === 'suspended') void this.audio.resume().catch(() => {});
    this.apply();
  }

  apply() {
    if (this.master && this.audio) this.master.gain.setTargetAtTime(this.settings.mute ? 0 : this.settings.volume, this.audio.currentTime, .035);
  }

  private tone(hz: number, length: number, voice: OscillatorType, volume: number, wait = 0, final = hz) {
    if (!this.audio || !this.master) return;
    const a = this.audio, at = a.currentTime + wait;
    const osc = a.createOscillator(), env = a.createGain();
    osc.type = voice;
    osc.frequency.setValueAtTime(hz, at);
    osc.frequency.exponentialRampToValueAtTime(final, at + length);
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(volume, at + .025);
    env.gain.exponentialRampToValueAtTime(.0001, at + length);
    osc.connect(env).connect(this.master);
    osc.start(at); osc.stop(at + length + .01);
  }

  cue(name: string) {
    if (name === 'jump') this.tone(173, .12, 'sine', .065, 0, 280);
    if (name === 'door') this.tone(95, .1, 'triangle', .12, 0, 48);
    if (name === 'hit') this.tone(145, .15, 'square', .05, 0, 55);
    if (name === 'alert' || name === 'bad') {
      this.tone(388, .2, 'triangle', .13, 0, 215);
      this.tone(245, .3, 'triangle', .09, .1, 146);
    }
    if (name === 'confirm' || name === 'reward')
      [293.7, 440, 587.3, ...(name === 'reward' ? [698.5, 880] : [])]
        .forEach((f, i) => this.tone(f, .34, 'sine', .13, i * .085));
  }

  step(speed: number, heat: number, riding: boolean, active: boolean) {
    if (!this.audio || !this.engine || !this.engineGain || !this.siren || !this.sirenGain) return;
    const t = this.audio.currentTime;
    this.engine.frequency.setTargetAtTime(43 + speed * .29, t, .08);
    this.engineGain.gain.setTargetAtTime(active && riding ? .046 + speed / 14000 : 0, t, .09);
    this.siren.frequency.setTargetAtTime(570 + Math.sin(t * 6) * 160, t, .04);
    this.sirenGain.gain.setTargetAtTime(active && heat >= 2 ? .034 + heat * .009 : 0, t, .1);
    if (!active || t < this.nextNote) return;
    this.nextNote = t + .36;
    const sequence = [73.42, 0, 73.42, 110, 69.3, 0, 69.3, 87.31, 65.41, 0, 65.41, 98, 69.3, 0, 69.3, 103.83];
    const note = sequence[this.beat % sequence.length];
    if (note) this.tone(note, .56, 'triangle', this.beat % 4 === 0 ? .078 : .047);
    if (note && this.beat % 2 === 0) this.tone(note * 4, .28, 'sine', .027);
    this.beat += 1;
  }
}
