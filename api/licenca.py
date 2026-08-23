from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
from typing import Any

PUBLICA = Path(__file__).parent / "chave_publica.json"


def _decodificar(valor: str) -> bytes:
    return base64.urlsafe_b64decode(valor + "=" * (-len(valor) % 4))


def verificar(chave: str) -> dict[str, Any] | None:
    try:
        prefixo, corpo_b64, assinatura_b64 = chave.strip().split(".")
        if prefixo != "CLA1": return None
        corpo, assinatura_bytes = _decodificar(corpo_b64), _decodificar(assinatura_b64)
        payload = json.loads(corpo)
        publica = json.loads(PUBLICA.read_text(encoding="utf-8"))
        assinatura = int.from_bytes(assinatura_bytes, "big")
        esperado = int.from_bytes(hashlib.sha256(corpo).digest(), "big")
        if pow(assinatura, int(publica["e"]), int(publica["n"])) != esperado: return None
        if payload.get("produto") != "clareia-apoiador" or payload.get("versao") != 1: return None
        return payload
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, OSError):
        return None


def checkout_url() -> str | None:
    valor = os.environ.get("CLAREIA_CHECKOUT_URL", "").strip()
    return valor if valor.startswith(("https://", "http://localhost", "http://127.0.0.1")) else None
