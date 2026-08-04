"""Configuração pública compartilhada pelas automações do Swipe.

O URL e a chave ``anon`` do Supabase são identificadores públicos usados pelo
próprio navegador. Os workflows preferem variáveis de ambiente, mas recuperam
os mesmos defaults usados pelas funções Netlify quando um secret do GitHub não
foi cadastrado. Credenciais privadas do bot continuam obrigatoriamente fora do
repositório.
"""
from pathlib import Path
import os
import re


ROOT = Path(__file__).resolve().parents[1]
SECURITY_MODULE = ROOT / "netlify" / "functions" / "_security.mjs"


def _public_default(constant):
    try:
        source = SECURITY_MODULE.read_text(encoding="utf-8")
    except OSError:
        return ""
    match = re.search(
        rf'const\s+{re.escape(constant)}\s*=\s*"([^"\r\n]+)"',
        source,
    )
    return match.group(1).strip() if match else ""


def supabase_public_config():
    """Retorna URL/anon do ambiente ou o mesmo fallback público da aplicação."""
    url = os.environ.get("SUPABASE_URL", "").strip() or _public_default("DEFAULT_SUPABASE_URL")
    anon = os.environ.get("SUPABASE_ANON_KEY", "").strip() or _public_default("DEFAULT_SUPABASE_ANON_KEY")
    return url.rstrip("/"), anon

