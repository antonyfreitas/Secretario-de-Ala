#!/usr/bin/env python3
"""Verifica o Sumário de atualizações recentes do Manual Geral (página pública).

Grava em data/manual-status.json só: o mês mais recente, a lista de meses, datas e um hash.
Não guarda nenhum texto da página. Faz uma requisição por execução e respeita o robots.txt.
"""
import hashlib
import html as htmllib
import json
import re
import sys
import urllib.error
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path

URL = "https://www.churchofjesuschrist.org/study/manual/general-handbook/summary-of-recent-updates?lang=por"
ROBOTS = "https://www.churchofjesuschrist.org/robots.txt"
UA = "secretaria-ala-monitor/1.0 (verificacao semanal de uma pagina publica; uso pessoal)"
OUT = Path("public/data/manual-status.json")
ERRO = Path("public/data/manual-erro.json")
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
RXM = re.compile(r"(" + "|".join(MESES) + r")\s+(?:de\s+)?(20\d\d)", re.I)
RX = re.compile(r"\b(" + "|".join(MESES) + r")\s+(?:de\s+)?(20\d\d)\b", re.I)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def robots_ok():
    try:
        linhas = get(ROBOTS).splitlines()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return True
        raise
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(linhas)
    return rp.can_fetch(UA, URL)


def falhar(msg):
    """Registra o motivo da falha em data/manual-erro.json e sai com erro (sem tocar no resultado anterior)."""
    hoje = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ERRO.parent.mkdir(parents=True, exist_ok=True)
    ERRO.write_text(json.dumps({"erroEm": hoje, "erro": str(msg)[:900]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.exit(f"ERRO: {msg}")


def diagnostico(html):
    ctx = [re.sub(r"\s+", " ", m.group(0)) for m in re.finditer(r".{0,40}\bde 20\d\d.{0,20}", html)][:3]
    marcas = [k for k in ("application/json", "__NEXT_DATA__", "__INITIAL", "window.__", "hydrat") if k in html]
    return f"scripts={html.count('<script')}; marcas={marcas}; ctx={ctx}"


def limpar(t):
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", "", t))).strip()


def analisar(html):
    """Lê só os títulos (h2/h3). Os meses são títulos h2 no formato 'Outubro de 2026'."""
    titulos = [limpar(m.group(1)) for m in re.finditer(r"<h[23][^>]*>(.*?)</h[23]>", html, re.I | re.S)]
    meses = []
    for t in titulos:
        m = RXM.fullmatch(t)
        if m:
            k = f"{m.group(2)}-{MESES.index(m.group(1).lower()) + 1:02d}"
            if k not in meses:
                meses.append(k)
    return " | ".join(titulos), meses


def main():
    antes = {}
    if OUT.exists():
        try:
            antes = json.loads(OUT.read_text(encoding="utf-8"))
        except ValueError:
            antes = {}
    html = ""
    try:
        if not robots_ok():
            falhar("O robots.txt não permite buscar esta página. Nada foi feito.")
        html = get(URL)
    except urllib.error.HTTPError as e:
        falhar(f"HTTP {e.code} em {str(e.url).split('?')[0]}")
    except urllib.error.URLError as e:
        falhar(f"Falha de rede: {e.reason}")
    except Exception as e:
        falhar(f"{type(e).__name__}: {e}")
    texto, meses = analisar(html)
    if not meses:
        falhar(f"Nenhum mês encontrado (HTML com {len(html)} bytes, texto com {len(texto)} caracteres). Idioma ou layout mudou. {diagnostico(html)}")
    hoje = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    topo = meses[0]
    th = hashlib.sha256(texto.encode("utf-8")).hexdigest()[:16]
    novo = bool(antes.get("ultimoMes")) and topo != antes["ultimoMes"]
    texto_mudou = bool(antes.get("textoHash")) and th != antes["textoHash"]
    saida = {
        "fonte": URL,
        "verificado": hoje,
        "ultimoMes": topo,
        "meses": meses[:6],
        "textoHash": th,
        "mudouEm": hoje if novo else antes.get("mudouEm"),
        "anterior": antes["ultimoMes"] if novo else antes.get("anterior"),
        "textoMudouEm": hoje if texto_mudou else antes.get("textoMudouEm"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    ERRO.unlink(missing_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Mês mais recente: {topo}. {'Mês novo detectado.' if novo else 'Sem mudança de mês.'}")


if __name__ == "__main__":
    main()
