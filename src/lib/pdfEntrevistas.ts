import { jsPDF } from 'jspdf';
import { fd, ymd } from './datas';
import { haTempo, TIPOS, type Entrevista } from './entrevistas';

interface Col { t: string; w: number }

function montar(titulo: string, ala: string, filtro: string, cols: Col[], linhas: string[][]): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 14;
  const W = 182;
  const PH = 297;
  let y = M;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(18, 49, 43);
  doc.text(titulo, M, y + 5);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 105, 98);
  const sub = `${ala} · gerado em ${fd(ymd(new Date()))}${filtro ? ` · filtro: "${filtro}"` : ''} · ${linhas.length} ${linhas.length === 1 ? 'linha' : 'linhas'}. Confidencial: uso restrito à liderança da ala.`;
  for (const l of doc.splitTextToSize(sub, W) as string[]) {
    doc.text(l, M, y + 3);
    y += 4;
  }
  y += 3;
  const cabecalho = () => {
    doc.setFillColor(18, 49, 43);
    doc.rect(M, y, W, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let x = M;
    for (const c of cols) {
      doc.text(c.t, x + 1.5, y + 4.5);
      x += c.w;
    }
    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(18, 49, 43);
  };
  cabecalho();
  for (const l of linhas) {
    const cel = l.map((t, i) => doc.splitTextToSize(t, cols[i].w - 3) as string[]);
    const h = Math.max(...cel.map((c) => c.length)) * 4 + 3;
    if (y + h > PH - 16) {
      doc.addPage();
      y = M;
      cabecalho();
    }
    let x = M;
    cel.forEach((c, i) => {
      c.forEach((t, j) => doc.text(t, x + 1.5, y + 4 + j * 4));
      x += cols[i].w;
    });
    y += h;
    doc.setDrawColor(200, 210, 205);
    doc.line(M, y, M + W, y);
  }
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(130, 145, 138);
    doc.text(`${ala} · página ${p}/${n}`, M, PH - 8);
  }
  return doc.output('blob');
}

/** Uma linha por pessoa: a última entrevista, há quanto tempo e por quem. */
export function pdfResumo(grupos: { nome: string; itens: Entrevista[] }[], ala: string, filtro: string): Blob {
  const cols: Col[] = [{ t: 'Pessoa', w: 38 }, { t: 'Última entrevista', w: 40 }, { t: 'Por quem', w: 34 }, { t: 'Tipo', w: 26 }, { t: 'Assunto', w: 32 }, { t: 'Total', w: 12 }];
  const linhas = grupos.map((g) => {
    const u = g.itens[0];
    return [g.nome, `${fd(u.data)} (${haTempo(u.data)})`, u.entrevistador, TIPOS[u.tipo], u.assunto || '-', String(g.itens.length)];
  });
  return montar('Entrevistas - resumo por pessoa', ala, filtro, cols, linhas);
}

/** Todas as entrevistas, da mais recente para a mais antiga. */
export function pdfLista(itens: Entrevista[], ala: string, filtro: string): Blob {
  const cols: Col[] = [{ t: 'Data', w: 24 }, { t: 'Pessoa', w: 38 }, { t: 'Por quem', w: 34 }, { t: 'Tipo', w: 28 }, { t: 'Assunto', w: 58 }];
  const linhas = [...itens].sort((a, b) => b.data.localeCompare(a.data)).map((e) => [fd(e.data), e.pessoa, e.entrevistador, TIPOS[e.tipo], e.assunto || '-']);
  return montar('Entrevistas - todas', ala, filtro, cols, linhas);
}
