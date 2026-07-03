#!/usr/bin/env python3
"""Sincroniza /opt/personas/*.md -> tabela collaborators do Supabase.

Fonte única: os arquivos de persona. O painel passa a mostrar a equipe real.
Uso:
    python3 sync_personas.py           # ensaio (dry-run): mostra o que faria
    python3 sync_personas.py --apply   # executa de verdade

Requer /opt/jarbas-painel/.env.local com:
    NEXT_PUBLIC_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

PERSONAS_DIR = Path("/opt/personas")
ENV_FILE = Path("/opt/jarbas-painel/.env.local")
SKIP_FILES = {"EQUIPE.md", "izzy-exemplos-legendas.md"}

# Aparência fixa por persona: (gender, skin_tone 0-4, hair_color 0-7,
# shirt_color 0-9, has_glasses). Camisas únicas dentro de cada gênero.
APPEARANCE = {
    "donna":   ("female", 2, 5, 6, False),
    "eric":    ("male",   3, 1, 2, False),
    "felipe":  ("male",   1, 4, 4, False),
    "harvey":  ("male",   0, 5, 5, True),
    "izzy":    ("female", 0, 3, 0, False),
    "jarbas":  ("male",   2, 0, 1, True),
    "junior":  ("male",   1, 2, 7, True),
    "katrina": ("female", 0, 6, 3, False),
    "lara":    ("female", 1, 7, 8, False),
    "louis":   ("male",   2, 5, 9, True),
    "mike":    ("male",   4, 0, 0, False),
    "nara":    ("female", 3, 1, 2, True),
    "rafaela": ("female", 2, 0, 4, False),
    "sofia":   ("female", 1, 3, 1, True),
    "theo":    ("male",   0, 3, 3, False),
    "tonny":   ("male",   3, 5, 8, True),
}


def load_env():
    if not ENV_FILE.exists():
        sys.exit(f"ERRO: {ENV_FILE} não existe. Crie com URL e SERVICE_ROLE_KEY.")
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("ERRO: faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local")
    return url.rstrip("/"), key


def api(url, key, method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{url}{path}", method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def get_section(text, title):
    m = re.search(rf"^## {re.escape(title)}[^\n]*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1).strip() if m else ""


def parse_persona(path):
    text = path.read_text()
    m = re.search(r"^# (.+?) — (.+?) (\S+)\s*$", text, re.M)
    if not m:
        return None
    name, role, icon = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
    bio_parts = [get_section(text, "Identidade e arquétipo"), get_section(text, "O que entrega")]
    bio = "\n\n".join(p for p in bio_parts if p)
    skills = get_section(text, "Arsenal")
    tom = get_section(text, "Tom de voz")
    personality = re.sub(r"\s+", " ", tom).strip()[:400]
    return {
        "name": name,
        "icon": icon,
        "specialization": role,
        "bio": bio[:1000],
        "skills": skills[:600],
        "personality": personality,
        "status": "active",
    }


def main():
    apply = "--apply" in sys.argv
    url, key = load_env()

    personas = {}
    for f in sorted(PERSONAS_DIR.glob("*.md")):
        if f.name in SKIP_FILES:
            continue
        p = parse_persona(f)
        if not p:
            print(f"AVISO: não consegui interpretar {f.name}, pulando")
            continue
        slug = f.stem
        if slug not in APPEARANCE:
            print(f"AVISO: {slug} sem aparência definida, pulando")
            continue
        g, sk, hr, sh, gl = APPEARANCE[slug]
        p.update(gender=g, skin_tone=sk, hair_color=hr, shirt_color=sh, has_glasses=gl)
        personas[p["name"]] = p

    print(f"Personas lidas: {len(personas)}")

    # user_id da dona da conta (primeiro usuário do auth)
    users = api(url, key, "GET", "/auth/v1/admin/users")
    ulist = users.get("users", users) if isinstance(users, dict) else users
    if not ulist:
        sys.exit("ERRO: nenhum usuário no auth do Supabase")
    user_id = ulist[0]["id"]

    existing = api(url, key, "GET", "/rest/v1/collaborators?select=id,name")
    by_name = {c["name"]: c for c in existing}
    print(f"No banco hoje: {len(existing)} colaboradores")

    to_delete = [c for c in existing if c["name"] not in personas]
    for c in to_delete:
        print(f"  REMOVER seed antigo: {c['name']}")
        if apply:
            api(url, key, "DELETE", f"/rest/v1/assignments?collaborator_id=eq.{c['id']}")
            api(url, key, "DELETE", f"/rest/v1/collaborators?id=eq.{c['id']}")

    for name, p in personas.items():
        p["user_id"] = user_id
        if name in by_name:
            print(f"  ATUALIZAR: {name}")
            if apply:
                api(url, key, "PATCH", f"/rest/v1/collaborators?id=eq.{by_name[name]['id']}", p)
        else:
            print(f"  CRIAR: {name} {p['icon']} ({p['specialization']})")
            if apply:
                api(url, key, "POST", "/rest/v1/collaborators", p, prefer="return=minimal")

    print("\nFEITO." if apply else "\nENSAIO — nada foi alterado. Rode com --apply para executar.")


if __name__ == "__main__":
    main()
