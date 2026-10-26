import { cuePresets } from '../creative/audio';
import type { AudioCue, CueVoice } from '../creative/audio';

export type { AudioCue } from '../creative/audio';
export interface AudioSettings { muted: boolean; volume: number }
export type AudioStatus = 'locked' | 'ready' | 'suspended' | 'unavailable' | 'blocked' | 'disposed';
export interface AudioDiagnostics {
  status: AudioStatus;
  activeVoices: number;
  duplicateEvents: number;
  droppedEvents: number;
}
type VisibilitySource = Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
interface AudioDirectorOptions {
  contextFactory?: () => AudioContext | null;
  visibility?: VisibilitySource | null;
  maxVoices?: number;
}
interface ActiveVoice { source: AudioScheduledSourceNode; gain: GainNode; filter: BiquadFilterNode | null }

function browserContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Context ? new Context() : null;
}

/** Generic MIT audio machinery. Authored cue compositions live in src/creative/audio.ts. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: AudioSettings = { muted: false, volume: .6 };
  private status: AudioStatus = 'locked';
  private voices = new Set<ActiveVoice>();
  private seen = new Set<string>();
  private duplicateEvents = 0;
  private droppedEvents = 0;
  private listening = false;
  private suspension: Promise<void> | null = null;
  private generation = 0;
  private readonly contextFactory: () => AudioContext | null;
  private readonly visibility: VisibilitySource | null;
  private readonly maxVoices: number;

  constructor(options: AudioDirectorOptions = {}) {
    this.contextFactory = options.contextFactory ?? browserContext;
    this.visibility = options.visibility === undefined ? (typeof document === 'undefined' ? null : document) : options.visibility;
    const requested = options.maxVoices ?? 12;
    this.maxVoices = Number.isFinite(requested) ? Math.min(12, Math.max(1, Math.floor(requested))) : 12;
  }

  /** Call only from a player gesture, and await before scheduling the gesture's cue. */
  async unlock(): Promise<boolean> {
    if (this.visibility?.hidden) return false;
    if (!this.listening && this.visibility) {
      this.visibility.addEventListener('visibilitychange', this.onVisibility);
      this.listening = true;
    }
    const generation = this.generation;
    try {
      if (!this.context || this.context.state === 'closed') {
        const created = this.contextFactory();
        if (!created) { this.status = 'unavailable'; return false; }
        try {
          const master = created.createGain();
          // Set the intrinsic value: updateMaster cancels scheduled values at this same time.
          master.gain.value = 0;
          master.connect(created.destination);
          this.context = created;
          this.master = master;
        } catch (error) {
          try { void created.close().catch(() => {}); } catch { /* Failed context cleanup. */ }
          throw error;
        }
        this.updateMaster();
      }
      const context = this.context;
      if (this.suspension) await this.suspension;
      if (generation !== this.generation || this.visibility?.hidden) return false;
      if (context.state !== 'running') await context.resume();
      if (generation !== this.generation || this.visibility?.hidden) return false;
      this.status = context.state === 'running' ? 'ready' : 'blocked';
      return this.status === 'ready';
    } catch {
      if (generation === this.generation) this.status = 'blocked';
      return false;
    }
  }

  configure(settings: AudioSettings): void {
    this.settings = { muted: settings.muted, volume: Number.isFinite(settings.volume) ? Math.max(0, Math.min(1, settings.volume)) : 0 };
    try {
      this.updateMaster();
      if (this.settings.muted || this.settings.volume === 0) this.stopVoices();
    } catch { this.status = 'blocked'; }
  }

  /** No queuing: muted, hidden or locked events are consumed without a later catch-up burst. */
  play(cue: AudioCue, eventId: string): boolean {
    if (!eventId || this.seen.has(eventId)) {
      this.duplicateEvents += 1;
      return false;
    }
    this.seen.add(eventId);
    // Keep recent semantic IDs through graphics replacement without unlimited drawing-event history.
    if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value!);
    if (!this.context || !this.master || this.context.state !== 'running' || this.visibility?.hidden || this.settings.muted || this.settings.volume === 0) {
      this.droppedEvents += 1;
      return false;
    }
    const preset = cuePresets[cue];
    let scheduled = false;
    try {
      for (let index = 0; index < preset.length; index += 1) {
        const voice = preset[index];
        if (!voice) continue;
        if (this.voices.size >= this.maxVoices) this.releaseVoice(this.voices.values().next().value!);
        this.scheduleVoice(voice, `${eventId}:${index}`);
        scheduled = true;
      }
    } catch {
      this.stopVoices();
      this.status = 'blocked';
      return false;
    }
    return scheduled;
  }

  getDiagnostics(): AudioDiagnostics {
    return { status: this.status, activeVoices: this.voices.size, duplicateEvents: this.duplicateEvents, droppedEvents: this.droppedEvents };
  }

  /** Safe to reuse after a later explicit unlock, including React development remounts. */
  dispose(): void {
    this.generation += 1;
    this.stopVoices();
    if (this.listening) this.visibility?.removeEventListener('visibilitychange', this.onVisibility);
    this.listening = false;
    const context = this.context;
    this.context = null;
    this.suspension = null;
    try { this.master?.disconnect(); } catch { /* Already disconnected. */ }
    this.master = null;
    this.status = 'disposed';
    if (context && context.state !== 'closed') {
      try { void context.close().catch(() => {}); } catch { /* A blocked context is already unusable. */ }
    }
  }

  private readonly onVisibility = (): void => {
    if (!this.visibility?.hidden || !this.context) return;
    this.stopVoices();
    this.status = 'suspended';
    const generation = this.generation;
    // A visible tab deliberately waits for unlock() in a new gesture before resuming.
    try {
      const pending = this.context.suspend();
      this.suspension = pending;
      void pending.catch(() => { if (generation === this.generation) this.status = 'blocked'; }).finally(() => {
        if (this.suspension === pending) this.suspension = null;
      });
    }
    catch { this.status = 'blocked'; }
  };

  private updateMaster(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    // Linear user volume; 12 voices × the largest authored peak (.14) × .5 < 1.
    const gain = this.settings.muted ? 0 : this.settings.volume * .5;
    this.master.gain.cancelScheduledValues(now);
    if (gain === 0) this.master.gain.setValueAtTime(0, now);
    else this.master.gain.setTargetAtTime(gain, now, .015);
  }

  private scheduleVoice(preset: CueVoice, seed: string): void {
    const context = this.context!;
    const master = this.master!;
    const start = context.currentTime + preset.delay;
    const end = start + preset.duration;
    const gain = context.createGain();
    let source: AudioScheduledSourceNode;
    let filter: BiquadFilterNode | null = null;
    if (preset.kind === 'noise') {
      const buffer = context.createBuffer(1, Math.max(1, Math.ceil(context.sampleRate * preset.duration)), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let state = 2166136261;
      for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
      for (let index = 0; index < samples.length; index += 1) {
        state = Math.imul(state, 1664525) + 1013904223 | 0;
        samples[index] = (state >>> 0) / 2147483648 - 1;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      source = noise;
      filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(preset.frequency, start);
      filter.Q.setValueAtTime(.5, start);
      source.connect(filter);
      filter.connect(gain);
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = preset.shape ?? 'sine';
      oscillator.frequency.setValueAtTime(preset.frequency, start);
      if (preset.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(preset.endFrequency, end);
      source = oscillator;
      source.connect(gain);
    }
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(preset.gain, start + Math.min(.015, preset.duration / 4));
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    gain.connect(master);
    const voice: ActiveVoice = { source, gain, filter };
    this.voices.add(voice);
    source.onended = () => this.releaseVoice(voice, false);
    source.start(start);
    source.stop(end + .02);
  }

  private releaseVoice(voice: ActiveVoice, stop = true): void {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null;
    if (stop) { try { voice.source.stop(); } catch { /* A completed source cannot be stopped twice. */ } }
    for (const node of [voice.source, voice.gain, voice.filter]) { try { node?.disconnect(); } catch { /* Already disconnected. */ } }
  }

  private stopVoices(): void { for (const voice of [...this.voices]) this.releaseVoice(voice); }
}

export const audio = new AudioDirector();
