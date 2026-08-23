from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("CLAREIA_DB", Path(__file__).parent / "dados" / "clareia.db"))


@contextmanager
def conectar():
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def inicializar() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with conectar() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS planos (
          id TEXT PRIMARY KEY, titulo TEXT NOT NULL, descricao TEXT NOT NULL,
          categoria TEXT NOT NULL, prazo_final TEXT NOT NULL, criado_em TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS passos (
          id TEXT PRIMARY KEY, plano_id TEXT NOT NULL REFERENCES planos(id) ON DELETE CASCADE,
          titulo TEXT NOT NULL, detalhe TEXT NOT NULL DEFAULT '', data_prevista TEXT NOT NULL,
          concluido_em TEXT, ordem INTEGER NOT NULL, ancora TEXT NOT NULL DEFAULT 'flexivel'
          CHECK (ancora IN ('rigida','flexivel'))
        );
        CREATE INDEX IF NOT EXISTS idx_passos_data ON passos(data_prevista);
        CREATE INDEX IF NOT EXISTS idx_passos_plano ON passos(plano_id, ordem);
        CREATE TABLE IF NOT EXISTS configuracoes (
          chave TEXT PRIMARY KEY, valor TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS modelos (
          id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT NOT NULL,
          categoria TEXT NOT NULL, passos_json TEXT NOT NULL, criado_em TEXT NOT NULL
        );
        """)
