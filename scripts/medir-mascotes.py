#!/usr/bin/env python3
"""Mede o retângulo de pixels NÃO transparentes de cada mascote e gera a tabela de correção.

Uso: python3 scripts/medir-mascotes.py
Lê public/mascotes/<agente>-512.webp e escreve src/lib/mascotes-medidas.ts.

Cada mascote é um quadrado com margens transparentes diferentes. A tabela guarda,
em fração do quadrado (0 a 1), onde ficam esquerda, topo, direita e pé do desenho.
O escritório usa isso para igualar a altura VISÍVEL de todos e apoiar o pé no ponto certo.
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "public" / "mascotes"
SAIDA = RAIZ / "src" / "lib" / "mascotes-medidas.ts"
LIMIAR_ALFA = 24  # ignora sombras e bordas quase invisíveis

linhas = []
for arq in sorted(PASTA.glob("*-512.webp")):
    nome = arq.name.removesuffix("-512.webp")
    im = Image.open(arq).convert("RGBA")
    alfa = im.getchannel("A").point(lambda v: 255 if v >= LIMIAR_ALFA else 0)
    bb = alfa.getbbox()
    if not bb:
        continue
    w, h = im.size
    l, t, r, b = bb
    linhas.append(f'  {nome}: {{ l: {l / w:.4f}, t: {t / h:.4f}, r: {r / w:.4f}, b: {b / h:.4f} }},')
    print(f"{nome:8s} altura visível {(b - t) / h:.3f}  largura {(r - l) / w:.3f}  margem de baixo {1 - b / h:.3f}")

SAIDA.write_text(
    "// GERADO por scripts/medir-mascotes.py. Não editar à mão.\n"
    "// Retângulo do desenho (pixels não transparentes) como fração do quadrado da imagem.\n"
    "export const MEDIDAS_MASCOTE: Record<string, { l: number; t: number; r: number; b: number }> = {\n"
    + "\n".join(linhas) + "\n};\n",
    encoding="utf-8",
)
print("escrito", SAIDA)
