import { BLOCOS, chamadoCompleto, falaDe, type ItemRoteiro } from '../dados/falas';
import { carregarRoteiro } from './roteiro';

export interface ExtrasPdf { falas: { titulo: string; texto: string; origem: string; pron?: string }[]; folhaSeparada: boolean }

const completo = (i: ItemRoteiro) => i.nome.trim().length > 0 && (i.bloco === 'novo_membro' || i.cargo.trim().length > 0);

/** Falas do roteiro (só deste aparelho) que entram no PDF. Blocos incompletos não saem. */
export function extrasDoRoteiro(uid: string | undefined, data: string, ala: string): ExtrasPdf | undefined {
  if (!data) return undefined;
  const e = carregarRoteiro(uid, data);
  const ordem = (i: ItemRoteiro) => BLOCOS.findIndex((b) => b.id === i.bloco);
  const falas = e.itens
    .filter(completo)
    .sort((a, b) => ordem(a) - ordem(b))
    .map((i) => {
      const b = BLOCOS.find((x) => x.id === i.bloco)!;
      const chamado = i.bloco === 'novo_membro' ? '' : ` (${chamadoCompleto(i, ala)})`;
      return { titulo: `${b.titulo}: ${i.nome.trim()}${chamado}`, texto: falaDe(i, ala).split('[pausa]').join('(pausa)'), origem: `Origem: ${b.origem}.`, pron: i.pronuncia?.trim() || undefined };
    });
  return falas.length ? { falas, folhaSeparada: !!e.folhaSeparada } : undefined;
}
