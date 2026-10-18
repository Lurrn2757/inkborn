import type { Evidence } from '../../shared/schema.js';
export function EvidenceExcerpt({ evidence }: { evidence: Evidence[] }) {
  return <div className="evidence"><span className="eyebrow">FROM YOUR NOTES</span>{evidence.map(item => <blockquote key={item.id}><p>“{item.quote}”</p><cite>Source passage · characters {item.start + 1}–{item.end}</cite></blockquote>)}</div>;
}
