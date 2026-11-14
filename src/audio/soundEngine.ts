// Enhanced procedural Web Audio API synthesizer for warm engine rumble, arcade FX, and music

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundEnabled = true;
  private musicEnabled = true;

  // Multi-harmonic engine nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning = false;

  // Music scheduler
  private musicTimer: number | null = null;
  private musicStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getDest(): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    return this.masterGain || ctx.destination;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setSettings(soundEnabled: boolean, musicEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (!soundEnabled && this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
    if (!musicEnabled) {
      this.stopMusic();
    }
  }

  public startEngine(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest || this.engineRunning) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    sub.type = 'sine';
    osc1.frequency.value = 58;
    osc2.frequency.value = 87;
    sub.frequency.value = 29;

    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 2.8;

    gain.gain.value = 0.0001;

    osc1.connect(filter);
    osc2.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start();
    osc2.start();
    sub.start();

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineSub = sub;
    this.engineFilter = filter;
    this.engineGain = gain;
    this.engineRunning = true;
  }

  public updateEngine(rpmPct: number, throttling: boolean, braking: boolean, active: boolean): void {
    if (
      !this.engineRunning ||
      !this.ctx ||
      !this.engineOsc1 ||
      !this.engineOsc2 ||
      !this.engineSub ||
      !this.engineFilter ||
      !this.engineGain
    ) {
      if (active && this.soundEnabled) {
        this.startEngine();
      }
      return;
    }

    const t = this.ctx.currentTime;
    if (!this.soundEnabled || !active) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }

    const clampedRpm = Math.max(0, Math.min(1.25, rpmPct));
    const jitter = Math.sin(t * 36) * (throttling ? 1.8 : 0.7);
    const baseFreq = 44 + clampedRpm * 92 + (throttling ? 20 : 0) + jitter;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.045);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.045);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.045);

    const cutoff = 190 + clampedRpm * 620 + (throttling ? 290 : 0) + (braking ? 90 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);

    const targetVol = throttling ? 0.085 : braking ? 0.048 : 0.028;
    this.engineGain.gain.setTargetAtTime(targetVol, t, 0.055);
  }

  public stopEngine(): void {
    if (!this.engineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSub?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineSub?.disconnect();
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // Ignore already stopped
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  public playClick(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.05);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playCoin(value = 5): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const firstFreq = value >= 500 ? 1318.5 : value >= 100 ? 1174.7 : value >= 25 ? 1046.5 : 987.77;
    const secondFreq = firstFreq * 1.334;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(firstFreq, t);
    osc1.frequency.setValueAtTime(secondFreq, t + 0.055);
    gain1.gain.setValueAtTime(0.14, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(t);
    osc1.stop(t + 0.23);

    // Metallic overtone sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(secondFreq * 2, t + 0.055);
    gain2.gain.setValueAtTime(0.0001, t);
    gain2.gain.setValueAtTime(0.05, t + 0.055);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(t + 0.055);
    osc2.stop(t + 0.21);
  }

  public playFuel(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const notes = [392, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = t + idx * 0.042;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  public playFlip(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = t + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  public playUpgrade(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = t + i * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  public playJump(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.13);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playLanding(intensity = 0.5): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const clamped = Math.max(0.25, Math.min(1, intensity));
    osc.frequency.setValueAtTime(115 + clamped * 45, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);
    gain.gain.setValueAtTime(0.16 * clamped, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playBrakeScreech(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.09);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 4.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t);
  }

  public playCrash(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.38);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.39);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.32);
    oscGain.gain.setValueAtTime(0.24, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.33);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.34);
  }

  public playLowFuelBeep(): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(780, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public startMusic(): void {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    const dest = this.getDest();
    if (!ctx || !dest) return;

    const bassPattern = [110, 110, 130.81, 146.83, 98, 98, 123.47, 146.83];
    const leadPattern = [440, 523.25, 659.25, 587.33, 392, 493.88, 587.33, 523.25];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const step = this.musicStep % bassPattern.length;
      this.musicStep++;

      // Warm bass groove
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassPattern[step], t);
      bassGain.gain.setValueAtTime(0.042, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.22);

      // Melodic pluck
      const leadNote = leadPattern[step];
      if (leadNote > 0 && step % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(leadNote, t);
        leadGain.gain.setValueAtTime(0.022, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        leadOsc.connect(leadGain);
        leadGain.connect(this.masterGain);
        leadOsc.start(t);
        leadOsc.stop(t + 0.19);
      }
    }, 235);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
