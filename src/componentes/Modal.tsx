import { useEffect, useRef, type ReactNode } from 'react';

interface Props { aberto: boolean; titulo: string; aoFechar: () => void; children: ReactNode }

/** Janela em primeiro plano (pop-up) usando o elemento nativo <dialog>: Esc fecha, o foco fica dentro. */
export default function Modal({ aberto, titulo, aoFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="modal" onClose={aoFechar} onClick={(e) => { if (e.target === ref.current) aoFechar(); }}>
      {aberto && (
        <div className="mbox">
          <div className="mhd"><h2>{titulo}</h2><button className="ib" type="button" onClick={aoFechar} aria-label="Fechar">×</button></div>
          {children}
        </div>
      )}
    </dialog>
  );
}
