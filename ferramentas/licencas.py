#!/usr/bin/env python3
"""Gera o par RSA do vendedor e emite licenças Clareia Apoiador.

Uso:
  python ferramentas/licencas.py gerar-chaves
  python ferramentas/licencas.py emitir --nome "Ana" --email ana@example.com
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import secrets
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PRIVADA = RAIZ / ".clareia-vendedor" / "chave_privada.json"
PUBLICA = RAIZ / "api" / "chave_publica.json"


def primo_provavel(n: int, rodadas: int = 32) -> bool:
    if n < 2 or any(n % p == 0 for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)):
        return n in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)
    d, s = n - 1, 0
    while d % 2 == 0: s, d = s + 1, d // 2
    for _ in range(rodadas):
        a = secrets.randbelow(n - 3) + 2
        x = pow(a, d, n)
        if x in (1, n - 1): continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1: break
        else: return False
    return True


def gerar_primo(bits: int) -> int:
    while True:
        n = secrets.randbits(bits) | (1 << bits - 1) | 1
        if primo_provavel(n): return n


def b64(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).decode().rstrip("=")


def gerar_chaves() -> None:
    e = 65537
    while True:
        p, q = gerar_primo(1024), gerar_primo(1024)
        phi = (p - 1) * (q - 1)
        if p != q and math.gcd(e, phi) == 1: break
    n, d = p * q, pow(e, -1, phi)
    PRIVADA.parent.mkdir(parents=True, exist_ok=True)
    PRIVADA.write_text(json.dumps({"n": str(n), "d": str(d)}, indent=2), encoding="utf-8")
    PUBLICA.write_text(json.dumps({"n": str(n), "e": e}, indent=2) + "\n", encoding="utf-8")
    print(f"Chave pública criada em {PUBLICA}")
    print(f"SEGREDO criado em {PRIVADA}. Faça backup; nunca envie ao GitHub.")


def emitir(nome: str, email: str) -> None:
    if not PRIVADA.exists(): raise SystemExit("Rode 'gerar-chaves' primeiro.")
    chave = json.loads(PRIVADA.read_text(encoding="utf-8"))
    payload = {"produto": "clareia-apoiador", "versao": 1, "id": secrets.token_hex(8), "nome": nome.strip(), "email": email.strip().casefold(), "emitida_em": datetime.now(timezone.utc).isoformat()}
    corpo = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()
    digest = int.from_bytes(hashlib.sha256(corpo).digest(), "big")
    assinatura = pow(digest, int(chave["d"]), int(chave["n"]))
    print("CLA1." + b64(corpo) + "." + b64(assinatura.to_bytes((assinatura.bit_length() + 7) // 8, "big")))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subs = parser.add_subparsers(dest="acao", required=True)
    subs.add_parser("gerar-chaves")
    emitir_p = subs.add_parser("emitir")
    emitir_p.add_argument("--nome", required=True)
    emitir_p.add_argument("--email", required=True)
    args = parser.parse_args()
    gerar_chaves() if args.acao == "gerar-chaves" else emitir(args.nome, args.email)
