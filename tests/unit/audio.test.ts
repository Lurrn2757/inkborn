import { describe, expect, it, vi } from 'vitest';
import { AudioDirector } from '../../src/audio/AudioDirector';
import { cuePresets } from '../../src/creative/audio';
import type { AudioCue } from '../../src/creative/audio';

class FakeParam {
  value = 1;
  changes: Array<{ value: number; time: number }> = [];
  cancelScheduledValues = vi.fn();
  setValueAtTime(value: number, time: number) { this.value = value; this.changes.push({ value, time }); }
  setTargetAtTime(value: number, time: number) { this.setValueAtTime(value, time); }
  exponentialRampToValueAtTime(value: number, time: number) { this.setValueAtTime(value, time); }
}
class FakeNode {
  connect = vi.fn();
  disconnect = vi.fn();
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeSource extends FakeNode {
  frequency = new FakeParam();
  type = 'sine';
  buffer: unknown = null;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class FakeFilter extends FakeNode { type = 'lowpass'; frequency = new FakeParam(); Q = new FakeParam(); }
class FakeContext {
  state: AudioContextState = 'suspended';
  currentTime = 2;
  sampleRate = 8000;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  filters: FakeFilter[] = [];
  buffers: Float32Array[] = [];
  blocked = false;
  failSource = false;
  createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain; }
  createOscillator() { if (this.failSource) throw new Error('blocked source'); const source = new FakeSource(); this.sources.push(source); return source; }
  createBufferSource() { return this.createOscillator(); }
  createBiquadFilter() { const filter = new FakeFilter(); this.filters.push(filter); return filter; }
  createBuffer(_channels: number, length: number) {
    const samples = new Float32Array(length); this.buffers.push(samples);
    return { getChannelData: () => samples };
  }
  resume = vi.fn(async () => { if (this.blocked) throw new Error('browser blocked'); this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}
class Visibility extends EventTarget {
  hidden = false;
  change(hidden: boolean) { this.hidden = hidden; this.dispatchEvent(new Event('visibilitychange')); }
}
function setup(maxVoices = 12) {
  const context = new FakeContext();
  const visibility = new Visibility();
  const factory = vi.fn(() => context as unknown as AudioContext);
  const audio = new AudioDirector({ contextFactory: factory, visibility, maxVoices });
  return { audio, context, visibility, factory };
}

describe('gesture-gated audio director', () => {
  it('creates/resumes only on explicit unlock and never queues locked events', async () => {
    const { audio, context, factory } = setup();
    expect(audio.play('awakening', 'locked-event')).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    expect(await audio.unlock()).toBe(true);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(audio.play('awakening', 'locked-event')).toBe(false);
    expect(audio.play('awakening', 'awake')).toBe(true);
    expect(audio.play('awakening', 'awake')).toBe(false);
    expect(audio.getDiagnostics()).toMatchObject({ status: 'ready', activeVoices: 3, duplicateEvents: 2, droppedEvents: 1 });
    audio.dispose();
  });

  it('mutes immediately, clamps volume and consumes muted events without replay', async () => {
    const { audio, context } = setup();
    await audio.unlock();
    audio.play('hit', 'hit');
    const master = context.gains[0]!;
    audio.configure({ muted: true, volume: .8 });
    expect(master.gain.value).toBe(0);
    expect(audio.getDiagnostics().activeVoices).toBe(0);
    expect(context.sources.every((source) => source.stop.mock.calls.length >= 2)).toBe(true);
    expect(audio.play('recovery', 'muted')).toBe(false);
    audio.configure({ muted: false, volume: 4 });
    expect(master.gain.value).toBe(.5);
    audio.configure({ muted: false, volume: .3 });
    expect(master.gain.value).toBe(.15);
    expect(audio.play('recovery', 'muted')).toBe(false);
    audio.configure({ muted: false, volume: Number.NaN });
    expect(master.gain.value).toBe(0);
    expect(audio.play('ink', 'zero-volume')).toBe(false);
    audio.dispose();
  });

  it('bounds simultaneous/scheduled voices, disconnects evictions and releases ended sounds', async () => {
    const { audio, context } = setup(4);
    await audio.unlock();
    for (const cue of Object.keys(cuePresets) as AudioCue[]) {
      expect(audio.play(cue, `event-${cue}`)).toBe(true);
      expect(audio.getDiagnostics().activeVoices).toBeLessThanOrEqual(4);
    }
    expect(context.sources[0]!.disconnect).toHaveBeenCalled();
    expect(context.buffers.length).toBeGreaterThan(0);
    expect(context.buffers.every((samples) => samples.some((sample) => sample !== 0) && samples.every((sample) => sample >= -1 && sample <= 1))).toBe(true);
    for (const source of context.sources) source.onended?.();
    expect(audio.getDiagnostics().activeVoices).toBe(0);
    expect(context.sources.every((source) => source.disconnect.mock.calls.length === 1)).toBe(true);
    audio.dispose();
  });

  it('keeps even the worst aligned voice peaks below digital clipping at full volume', async () => {
    const { audio, context } = setup(100);
    audio.configure({ muted: false, volume: 1 });
    await audio.unlock();
    for (let index = 0; index < 30; index += 1) audio.play('hit', `impact-${index}`);
    expect(audio.getDiagnostics().activeVoices).toBe(12);
    const largestVoicePeak = Math.max(...Object.values(cuePresets).flat().map((voice) => voice.gain));
    expect(largestVoicePeak * audio.getDiagnostics().activeVoices * context.gains[0]!.gain.value).toBeLessThan(1);
    audio.dispose();
  });

  it('suspends hidden audio without automatic resume or catch-up bursts', async () => {
    const { audio, context, visibility } = setup();
    visibility.change(true);
    expect(await audio.unlock()).toBe(false);
    expect(context.resume).not.toHaveBeenCalled();
    visibility.change(false);
    await audio.unlock();
    audio.play('corrupt', 'mistake');
    visibility.change(true);
    expect(context.suspend).toHaveBeenCalledTimes(1);
    expect(audio.getDiagnostics()).toMatchObject({ status: 'suspended', activeVoices: 0 });
    expect(audio.play('hit', 'hidden')).toBe(false);
    visibility.change(false);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(audio.play('hit', 'still-suspended')).toBe(false);
    expect(await audio.unlock()).toBe(true);
    expect(audio.play('hit', 'hidden')).toBe(false);
    expect(audio.play('hit', 'new-visible')).toBe(true);
    audio.dispose();
  });

  it('tolerates unavailable/blocked audio and source failures without throwing', async () => {
    const unavailable = new AudioDirector({ contextFactory: () => null, visibility: null });
    expect(await unavailable.unlock()).toBe(false);
    expect(unavailable.getDiagnostics().status).toBe('unavailable');
    unavailable.dispose();
    const { audio, context } = setup();
    context.blocked = true;
    expect(await audio.unlock()).toBe(false);
    expect(audio.getDiagnostics().status).toBe('blocked');
    expect(audio.play('hit', 'blocked')).toBe(false);
    context.blocked = false;
    expect(await audio.unlock()).toBe(true);
    context.failSource = true;
    expect(audio.play('hit', 'failed-source')).toBe(false);
    expect(audio.getDiagnostics()).toMatchObject({ status: 'blocked', activeVoices: 0 });
    audio.dispose();
  });

  it('waits for a pending background suspension before a later gesture resumes audio', async () => {
    const { audio, context, visibility } = setup();
    await audio.unlock();
    let finishSuspend: () => void = () => { throw new Error('Suspension was not requested.'); };
    context.suspend.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishSuspend = () => { context.state = 'suspended'; resolve(); };
    }));
    visibility.change(true);
    visibility.change(false);
    const resumed = audio.unlock();
    expect(context.resume).toHaveBeenCalledTimes(1);
    finishSuspend();
    expect(await resumed).toBe(true);
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(audio.getDiagnostics().status).toBe('ready');
    audio.dispose();
  });

  it('cleans up listeners and contexts while retaining deduplication through reuse', async () => {
    const { audio, context, visibility, factory } = setup();
    await audio.unlock();
    audio.play('victory', 'battle-result');
    audio.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(audio.getDiagnostics()).toMatchObject({ status: 'disposed', activeVoices: 0 });
    visibility.change(true);
    expect(context.suspend).not.toHaveBeenCalled();
    visibility.change(false);
    expect(await audio.unlock()).toBe(true);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(audio.play('victory', 'battle-result')).toBe(false);
    audio.dispose();
  });
});
