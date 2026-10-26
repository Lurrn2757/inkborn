/* global OfflineAudioContext */
// Native synthesis probe; run with node --import tsx. No audio hardware claim.
import { chromium } from '@playwright/test';
import { AudioDirector } from '../src/audio/AudioDirector.ts';
import { cuePresets } from '../src/creative/audio.ts';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: 'globalThis.__name = target => target;' });
  const results = await page.evaluate(async data => {
    const cuePresets = data.presets;
    const Director = eval(`(() => { const __name = target => target; return (${data.source}); })()`);
    const results = [];
    for (const [name, voices] of Object.entries(cuePresets)) {
      const duration = Math.max(...voices.map(voice => voice.delay + voice.duration)) + .2;
      const context = new OfflineAudioContext(1, Math.ceil(duration * 22050), 22050);
      const proxy = new Proxy(context, { get(target, key) { if (key === 'state') return 'running'; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
      const audio = new Director({ contextFactory: () => proxy, visibility: null });
      audio.configure({ muted: false, volume: 1 }); await audio.unlock();
      if (!audio.play(name, `native:${name}`)) throw new Error(`Could not schedule ${name}`);
      const buffer = await context.startRendering(); const samples = buffer.getChannelData(0);
      let peak = 0, energy = 0; for (const value of samples) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      if (!(peak > 0 && peak < 1 && energy > 0)) throw new Error(`Silent or clipped ${name}`);
      results.push({ cue: name, duration, peak, rms: Math.sqrt(energy / samples.length) });
    }
    return results;
  }, { source: AudioDirector.toString(), presets: cuePresets });
  await writeFile('devpost/cinematic-audio-verification.json', JSON.stringify({ engine: await browser.version(), nativeOfflineAudioContext: true, hardwareListeningVerified: false, results }, null, 2) + '\n');
  console.log(`Native Web Audio: ${results.length} original cues rendered with nonzero, unclipped output.`);
} finally { await browser.close(); }
