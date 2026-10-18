#!/usr/bin/env python3
"""Regenera public/mascotes/<agente>-256.webp e -512.webp a partir de /root/mascotes/<agente>.png.

Uso: python3 scripts/mascotes-converter.py [agente ...]   (sem argumentos, converte todos)
O Jarbas vem da pose aprovada em /root/apresentacoes/jarbas-poses/pensando.png,
recortada e centralizada num quadrado, a menos que exista /root/mascotes/jarbas.png.
"""
import sys
from pathlib import Path
from PIL import Image

ORIGEM = Path("/root/mascotes")
POSE_JARBAS = Path("/root/apresentacoes/jarbas-poses/pensando.png")
DESTINO = Path(__file__).resolve().parent.parent / "public" / "mascotes"
AGENTES = "jarbas eric mike izzy donna nara felipe harvey junior tonny theo rafaela louis lara sofia katrina".split()


def quadrado(im: Image.Image, margem: float = 0.04) -> Image.Image:
    """Recorta o espaço vazio e centraliza num quadrado transparente."""
    im = im.convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    lado = max(im.size)
    pad = int(lado * margem)
    sq = Image.new("RGBA", (lado + 2 * pad, lado + 2 * pad), (0, 0, 0, 0))
    sq.paste(im, ((sq.width - im.width) // 2, (sq.height - im.height) // 2), im)
    return sq


def converter(nome: str) -> bool:
    fonte = ORIGEM / f"{nome}.png"
    if not fonte.exists():
        if nome == "jarbas" and POSE_JARBAS.exists():
            fonte = POSE_JARBAS
        else:
            print(f"pulando {nome}: {fonte} não existe")
            return False
    im = quadrado(Image.open(fonte))
    DESTINO.mkdir(parents=True, exist_ok=True)
    for tam in (256, 512):
        im.resize((tam, tam), Image.LANCZOS).save(DESTINO / f"{nome}-{tam}.webp", "WEBP", quality=82, method=6)
    print(f"ok {nome}")
    return True


if __name__ == "__main__":
    alvo = sys.argv[1:] or AGENTES
    ok = sum(converter(n) for n in alvo)
    print(f"{ok}/{len(alvo)} convertidos em {DESTINO}")
