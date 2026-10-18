import { useEffect, useRef, type ReactNode } from 'react';
type Props = { title: string; onClose: () => void; children: ReactNode };
export function Dialog({ title, onClose, children }: Props) {
  const reference = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = reference.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={reference} className="folio-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === reference.current) onClose(); }}><div className="dialog-top"><p className="eyebrow">INKBORN / FIELD NOTES</p><button className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div><h2 id="dialog-title">{title}</h2>{children}</dialog>;
}
