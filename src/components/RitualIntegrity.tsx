import { RITUAL_SEALS } from '../battle/ritual.js';

export function RitualIntegrity({ remaining, struck }: { remaining: number; struck: boolean }) {
  const mood = remaining === 5 ? 'Bound' : remaining >= 3 ? 'Fractured' : remaining >= 1 ? 'Critical' : 'Broken';
  return <div className="ritual-integrity" role="status" aria-live="polite" aria-label={`Ritual Integrity: ${remaining} of ${RITUAL_SEALS} seals intact. ${mood}.`}>
    <div className="ritual-label"><span>RITUAL INTEGRITY</span><strong>{mood} <span>{remaining}/{RITUAL_SEALS}</span></strong></div>
    <div className="ritual-wards" aria-hidden="true">{Array.from({ length: RITUAL_SEALS }, (_, index) => {
      const intact = index < remaining;
      const breaking = struck && index === remaining;
      return <span key={index} className={`ritual-ward ${intact ? 'intact' : 'broken'} ${breaking ? 'is-breaking' : ''}`}>
        <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21"/><path className="ward-seal" d="m24 7 13 17-13 17L11 24Zm0 8v18m-8-9h16M9 9l5 5m20 20 5 5M39 9l-5 5M14 34l-5 5"/><path className="ward-fracture" d="m25 3-5 14 9 8-9 8 4 12"/></svg>
        <i/><i/><i/>
      </span>;
    })}</div>
  </div>;
}
