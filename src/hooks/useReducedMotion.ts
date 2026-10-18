import { useEffect, useState } from 'react';
export function useReducedMotion(preference: 'system' | 'reduced' | 'full'): boolean {
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setSystem(query.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return preference === 'reduced' || (preference === 'system' && system);
}
