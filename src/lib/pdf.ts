// @ts-nocheck
// Gerador do PDF de 1 folha (portado do site em arquivo único).
import { jsPDF } from 'jspdf';

const PAO='Ó Deus, Pai Eterno, nós te rogamos em nome de teu Filho, Jesus Cristo, que abençoes e santifiques este pão para as almas de todos os que partilharem dele, para que o comam em lembrança do corpo de teu Filho e testifiquem a ti, ó Deus, Pai Eterno, que desejam tomar sobre si o nome de teu Filho e recordá-lo sempre e guardar os mandamentos que ele lhes deu, para que possam ter sempre consigo o seu Espírito. Amém.';
const AGUA='Ó Deus, Pai Eterno, nós te rogamos em nome de teu Filho, Jesus Cristo, que abençoes e santifiques esta água, para as almas de todos os que beberem dela, para que o façam em lembrança do sangue de teu Filho, que por eles foi derramado, e testifiquem a ti, ó Deus, Pai Eterno, que sempre se lembram dele, para que possam ter consigo o seu Espírito. Amém.';
const NOTA='Apoio e desobrigações / Apresentação dos apoiados no S. Aarônico / Reconhecimento de membros e recém-conversos na ala / Abençoar e dar nome a crianças / Confirmação de novos conversos';
export const fd=s=>s?s.split('-').reverse().join('/'):'';
export const lines=s=>(s||'').split('\n').map(t=>t.trim()).filter(Boolean);

export function buildPdf(d,s){
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const M=12,CW=186,PH=297,LH=4.6*s,P=2*s,MH=8*s,GAP=2.6*s,BH=5.6*s,F=10*s,INK=[18,49,43];
  let y=M,over=false;
  doc.setDrawColor(130,145,138);doc.setLineWidth(.25);
  const need=h=>{if(y+h>PH-M)over=true};
  const txt=(t,x,yy,st='normal',sz=F,col=INK)=>{doc.setFont('helvetica',st);doc.setFontSize(sz);doc.setTextColor(col[0],col[1],col[2]);doc.text(t,x,yy)};
  const bar=n=>{need(BH);doc.setFillColor(INK[0],INK[1],INK[2]);doc.rect(M,y,CW,BH,'F');txt(n.toUpperCase(),M+P,y+BH*.72,'bold',F*.95,[255,255,255]);y+=BH};
  const cells=a=>{
    const m=a.map(([l,v,w])=>{
      doc.setFont('helvetica','bold');doc.setFontSize(F);
      const lw=doc.getTextWidth(l+':')+1.5*s,st=lw>w*.55;
      doc.setFont('helvetica','normal');
      return{l,w,lw,st,t:v?doc.splitTextToSize(v,st?w-2*P:w-2*P-lw):[]};
    });
    const h=Math.max(MH,...m.map(c=>2*P+(c.st?LH:0)+Math.max(1,c.t.length)*LH-s));
    need(h);let x=M;
    m.forEach(c=>{
      doc.rect(x,y,c.w,h);const b=y+P+F*.31;
      txt(c.l+':',x+P,b,'bold');
      const x0=c.st?x+P:x+P+c.lw,b0=c.st?b+LH:b;
      if(c.t.length)c.t.forEach((q,i)=>txt(q,x0,b0+i*LH));
      else doc.line(x0,b0+.9*s,x+c.w-P,b0+.9*s);
      x+=c.w;
    });
    y+=h;
  };
  const list=(label,note,items)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(F);
    const L=[];items.forEach(t=>doc.splitTextToSize(t,CW-2*P-5*s).forEach((q,i)=>L.push([i?'':'-',q])));
    const NL=LH*.9,nl=note?doc.splitTextToSize(note,CW-2*P):[];
    const h=2*P+(label?LH:0)+nl.length*NL+Math.max(L.length,2)*LH;
    need(h);doc.rect(M,y,CW,h);let yy=y+P+F*.31;
    if(label){txt(label+':',M+P,yy,'bold');yy+=LH}
    nl.forEach(q=>{txt(q,M+P,yy,'italic',F*.85,[90,105,98]);yy+=NL});
    if(L.length)L.forEach(([b,q])=>{txt(b,M+P,yy);txt(q,M+P+5*s,yy);yy+=LH});
    else for(let i=0;i<2;i++){doc.line(M+P,yy+.9*s,M+CW-P,yy+.9*s);yy+=LH}
    y+=h;
  };
  const prayer=(label,text)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(F*.9);
    const t=doc.splitTextToSize(text,CW-2*P),PL=LH*.9,h=2*P+LH+t.length*PL;
    need(h);doc.rect(M,y,CW,h);
    txt(label+':',M+P,y+P+F*.31,'bold');
    t.forEach((q,i)=>txt(q,M+P,y+P+F*.31+LH+i*PL,'normal',F*.9));
    y+=h;
  };

  const T=17*s,tb=y+T*.3;
  txt('Ata - Ala '+(d.ala||'')+(d.data?' - '+fd(d.data):''),M,tb,'bold',T);
  doc.setFont('helvetica','bold');doc.setFontSize(F);
  const rx=M+CW,fw=26*s,fl='Freq.:',flw=doc.getTextWidth(fl)+1.5;
  txt(fl,rx-fw-flw,tb,'bold');
  if(d.freq)txt(d.freq,rx-fw+1,tb);else doc.line(rx-fw,tb+.9,rx,tb+.9);
  y+=T*.3+3.4*s;

  bar('Informações');
  cells([['Presidida',d.presidida,CW/2],['Dirigida',d.dirigida,CW/2]]);
  cells([['Regente',d.regente,CW/2],['Pianista',d.pianista,CW/2]]);
  y+=GAP;bar('Abertura');
  cells([['Boas-vindas / Reconhecimentos de autoridades e líderes',d.boasvindas,CW]]);
  list('Anúncios','',lines(d.anuncios));
  cells([['Hino de abertura',d.hinoAbertura,CW/2],['Oração de abertura',d.oracaoAbertura,CW/2]]);
  y+=GAP;bar('Assuntos da ala e da estaca');
  list('',NOTA,lines(d.assuntos));
  y+=GAP;bar('Sacramento');
  cells([['Hino sacramental',d.hinoSacramental,CW]]);
  if(d.incluirOr){prayer('Benção do Pão',PAO);prayer('Benção da Água',AGUA)}
  y+=GAP;bar('Mensagens do evangelho');
  cells([['Primeiro orador',d.orador1,CW]]);
  cells([['Segundo orador',d.orador2,CW]]);
  cells([['Hino intermediário',d.hinoInter,CW]]);
  cells([['Último orador',d.orador3,CW]]);
  y+=GAP;bar('Encerramento');
  cells([['Último hino',d.ultimoHino,CW/2],['Última oração',d.ultimaOracao,CW/2]]);
  return{doc,over,s};
}
export function fit(d){let r;for(let k=20;k>=10;k--){r=buildPdf(d,k/20);if(!r.over)break}return r}

