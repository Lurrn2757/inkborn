import { useState } from 'react';
import type { Settings } from '../app/SessionController.js';
import { audio } from '../audio/AudioDirector.js';
import { Dialog } from './Dialog.js';

export function SettingsDialog({ settings, onChange, onClose }: { settings: Settings; onChange: (settings: Partial<Settings>) => void; onClose: () => void }) {
  const [soundStatus, setSoundStatus] = useState('Sound begins after your first interaction.');
  async function testSound() {
    await audio.unlock();
    audio.configure(settings);
    const played = audio.play('recovery', `sound-check-${performance.now()}`);
    setSoundStatus(settings.muted ? 'Sound is muted. Unmute to hear the crystal.' : played ? 'A crystal chime is playing.' : 'Audio is unavailable or blocked in this browser. The battle remains fully visual.');
  }
  return <Dialog title="Set the atmosphere." onClose={onClose}>
    <div className="settings-section"><p className="eyebrow">SOUND</p>
      <label className="setting-toggle"><span>Mute all sound<small>Every sound also has a visible response.</small></span><input type="checkbox" checked={settings.muted} onChange={event => onChange({ muted: event.target.checked })}/></label>
      <label className="setting-range"><span>Volume <output>{Math.round(settings.volume * 100)}%</output></span><input aria-label="Sound volume" type="range" min="0" max="100" value={Math.round(settings.volume * 100)} onChange={event => onChange({ volume: Number(event.target.value) / 100 })}/></label>
      <button className="text-button" onClick={() => { void testSound(); }}>Play a crystal chime ♫</button><p className="settings-status" role="status" aria-label="Sound test feedback">{soundStatus}</p>
    </div>
    <div className="settings-section"><label className="setting-select"><span className="eyebrow">MOTION</span><select aria-label="Motion preference" value={settings.motion} onChange={event => onChange({ motion: event.target.value as Settings['motion'] })}><option value="system">Follow device preference</option><option value="reduced">Reduced motion</option><option value="full">Full cinematic motion</option></select></label><p className="settings-status">Reduced motion replaces large movement and bursts with gentle emphasis. Your answers and outcomes stay the same.</p></div>
    <button className="button ink-button" onClick={onClose}>Return to the chamber →</button>
  </Dialog>;
}
