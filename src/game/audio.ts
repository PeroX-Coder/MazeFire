/**
 * Procedural Web Audio Engine for MazeFire
 * 100% code-synthesized audio: zero external assets, zero 404s.
 * Provides dark, eerie gothic dungeon atmosphere, footstep thuds,
 * heartbeats under pressure, trap snaps, and sizzling lava.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private lastFootstepTime: number = 0;
  private lastHeartbeatTime: number = 0;

  constructor() {
    // Will be initialized upon user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.65;
      this.masterGain.connect(this.ctx.destination);

      this.startAmbientDrone();
    } catch {
      // AudioContext not allowed or unsupported
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.22;
      this.ambientGain.connect(this.masterGain);

      // Low ominous dungeon drone
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.value = 52.0; // Low G# / A-flat

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.value = 54.5; // Slight detune for slow eerie beating

      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.value = 160;
      this.droneFilter.Q.value = 4.0;

      // LFO slowly sweeps the filter frequency for breathing, claustrophobic stone ambience
      this.droneLfo = this.ctx.createOscillator();
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.value = 0.12; // slow 8-second cycle

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 60; // sweeps filter between 100Hz and 220Hz
      this.droneLfo.connect(lfoGain);
      lfoGain.connect(this.droneFilter.frequency);

      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.ambientGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
      this.droneLfo.start();
    } catch {
      // Ignore background audio failures
    }
  }

  /**
   * Footstep on ancient stone floor
   */
  public playFootstep(isSprinting: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const minInterval = isSprinting ? 0.32 : 0.48;
    if (now - this.lastFootstepTime < minInterval) return;
    this.lastFootstepTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Pitch variation for natural stone crunch
      const baseFreq = 85 + (Math.random() - 0.5) * 20;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Spike trap snaps upward
   */
  public playSpikeSnap() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // Metallic clatter
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.value = 5.0;

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Player impaled by spikes
   */
  public playSpikeDeath() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // Heavy crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.5);

      // Metallic sting
      const metal = this.ctx.createOscillator();
      const metalGain = this.ctx.createGain();
      metal.type = 'square';
      metal.frequency.setValueAtTime(1400, now);
      metal.frequency.exponentialRampToValueAtTime(200, now + 0.3);

      metalGain.gain.setValueAtTime(0.5, now);
      metalGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      metal.connect(metalGain);
      metalGain.connect(this.masterGain);
      metal.start(now);
      metal.stop(now + 0.4);
    } catch {}
  }

  /**
   * Player incinerated in lava
   */
  public playLavaDeath() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // Noise hiss sizzle buffer
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.55);
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.6);

      // Deep combustion rumble
      const osc = this.ctx.createOscillator();
      const rumbleGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);

      rumbleGain.gain.setValueAtTime(0.7, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(rumbleGain);
      rumbleGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.55);
    } catch {}
  }

  /**
   * Heartbeat pulse when time is critically low (< 20s)
   */
  public updateHeartbeat(timeRemaining: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (timeRemaining > 20 || timeRemaining <= 0) return;

    const now = this.ctx.currentTime;
    // Interval scales from 1.2s down to 0.4s as time counts to 0
    const urgency = 1 - timeRemaining / 20; // 0 to 1
    const interval = 1.2 - urgency * 0.75;

    if (now - this.lastHeartbeatTime >= interval) {
      this.lastHeartbeatTime = now;
      this.playHeartbeatThud();
    }
  }

  private playHeartbeatThud() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);

      // Echo lub-dub pulse
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(65, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(32, now + 0.24);

      gain2.gain.setValueAtTime(0.45, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.26);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.28);
    } catch {}
  }

  /**
   * Deep cavernous thunder strike echoing through the stone labyrinth
   */
  public playThunder() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // 1. Initial sharp crackle / snap
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      const snapFilter = this.ctx.createBiquadFilter();

      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(600, now);
      snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(800, now);
      snapFilter.Q.value = 2.5;

      snapGain.gain.setValueAtTime(0.5, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      snapOsc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.masterGain);

      snapOsc.start(now);
      snapOsc.stop(now + 0.2);

      // 2. Rolling subterranean rumble noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 2.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter for deep earthquake/thunder rumble
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.linearRampToValueAtTime(70, now + 2.0);

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.9, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      noise.connect(filter);
      filter.connect(rumbleGain);
      rumbleGain.connect(this.masterGain);

      noise.start(now + 0.05);
      noise.stop(now + 2.3);

      // 3. Sub-bass vibration
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(58, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.8);

      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(now + 0.05);
      subOsc.stop(now + 1.9);
    } catch {}
  }

  /**
   * Timeout catastrophe sound
   */
  public playTimeoutBong() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 1.2);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.5);
    } catch {}
  }

  /**
   * Reaching the level exit portal
   */
  public playLevelComplete() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      // Ethereal chord
      const freqs = [330, 440, 554, 659];
      freqs.forEach((f, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + 1.3);
      });
    } catch {}
  }

  /**
   * Complete all 5 levels - Grand victory chime
   */
  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    try {
      const notes = [261.6, 329.6, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.15;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.5);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 1.6);
      });
    } catch {}
  }

  /**
   * Clean up Web Audio resources
   */
  public dispose() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

export const sound = new SoundSystem();
