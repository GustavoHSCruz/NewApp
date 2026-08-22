from __future__ import annotations

import html
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .banco import conectar, inicializar
from .motor import classificar, distribuir, enriquecer_com_ollama, ollama_disponivel, passos_deterministicos, preparar, titulo_sugerido

VERSAO = "1.0.0"


class Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PrepararEntrada(Modelo):
    descricao: str = Field(min_length=3, max_length=1000)
    prazo_final: date


class PlanoEntrada(Modelo):
    descricao: str = Field(min_length=3, max_length=1000)
    prazo_final: date
    categoria: str | None = Field(default=None, max_length=40)
    titulo: str | None = Field(default=None, min_length=1, max_length=100)
    respostas: dict[str, Any] = Field(default_factory=dict)
    usar_ollama: bool = False


class PlanoEdicao(Modelo):
    titulo: str | None = Field(default=None, min_length=1, max_length=100)
    descricao: str | None = Field(default=None, min_length=3, max_length=1000)
    prazo_final: date | None = None


class PassoEntrada(Modelo):
    titulo: str = Field(min_length=1, max_length=160)
    detalhe: str = Field(default="", max_length=1000)
    data_prevista: date | None = None
    ancora: bool = False


class PassoEdicao(Modelo):
    titulo: str | None = Field(default=None, min_length=1, max_length=160)
    detalhe: str | None = Field(default=None, max_length=1000)
    data_prevista: date | None = None
    concluido: bool | None = None
    ancora: bool | None = None


class AdiarEntrada(Modelo):
    dias: int = Field(ge=1, le=365)


class OrdemEntrada(Modelo):
    passos: list[str] = Field(min_length=1)


def erro(status: int, codigo: str, mensagem: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"erro": {"codigo": codigo, "mensagem": mensagem}})


@asynccontextmanager
async def lifespan(_: FastAPI):
    inicializar()
    yield


app = FastAPI(title="Clareia API", version=VERSAO, lifespan=lifespan, docs_url="/api/docs", redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5177", "http://127.0.0.1:5177"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def validacao(_: Request, exc: RequestValidationError):
    detalhe = exc.errors()[0] if exc.errors() else {}
    campo = ".".join(str(x) for x in detalhe.get("loc", [])[1:])
    return erro(422, "dados_invalidos", f"Revise o campo {campo or 'informado'}." )


@app.exception_handler(Exception)
async def inesperado(_: Request, exc: Exception):
    if isinstance(exc, sqlite3.Error):
        return erro(500, "banco_indisponivel", "Não foi possível acessar seus dados locais.")
    return erro(500, "erro_interno", "Algo inesperado aconteceu. Tente novamente.")


def agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def passo_dict(linha: sqlite3.Row) -> dict[str, Any]:
    passo = {chave: linha[chave] for chave in ("id", "titulo", "detalhe", "data_prevista", "concluido_em", "ordem")}
    passo["ancora"] = linha["ancora"] == "rigida"
    return passo


def obter_plano(db: sqlite3.Connection, plano_id: str) -> dict[str, Any] | None:
    plano = db.execute("SELECT * FROM planos WHERE id=?", (plano_id,)).fetchone()
    if not plano:
        return None
    passos = [passo_dict(x) for x in db.execute("SELECT * FROM passos WHERE plano_id=? ORDER BY ordem", (plano_id,))]
    return {**dict(plano), "passos": passos, "total": len(passos), "concluidos": sum(bool(x["concluido_em"]) for x in passos)}


def recurso_ausente(nome: str = "plano") -> JSONResponse:
    return erro(404, "nao_encontrado", f"Esse {nome} não existe mais.")


@app.get("/api/saude")
def saude():
    disponivel, modelo = ollama_disponivel()
    return {"versao": VERSAO, "ollama": disponivel, "modelo": modelo}


@app.post("/api/planos/preparar")
def preparar_plano(entrada: PrepararEntrada):
    return preparar(entrada.descricao)


@app.post("/api/planos", status_code=201)
def criar_plano(entrada: PlanoEntrada):
    hoje = date.today()
    if entrada.prazo_final < hoje:
        return erro(422, "prazo_no_passado", "Escolha hoje ou uma data futura para concluir o plano.")
    categoria = entrada.categoria if entrada.categoria in {"mudanca", "entrevista", "documentos", "viagem", "evento", "generico"} else classificar(entrada.descricao)
    titulos = enriquecer_com_ollama(entrada.descricao, categoria, entrada.respostas) if entrada.usar_ollama else None
    titulos = titulos or passos_deterministicos(categoria, entrada.respostas)
    datas = distribuir(hoje, entrada.prazo_final, len(titulos))
    plano_id = uuid.uuid4().hex
    with conectar() as db:
        db.execute("INSERT INTO planos VALUES (?,?,?,?,?,?)", (plano_id, entrada.titulo or titulo_sugerido(entrada.descricao), entrada.descricao, categoria, entrada.prazo_final.isoformat(), agora()))
        for ordem, (titulo, prevista) in enumerate(zip(titulos, datas)):
            ancora = "rigida" if ordem == len(titulos) - 1 else "flexivel"
            db.execute("INSERT INTO passos VALUES (?,?,?,?,?,?,?,?)", (uuid.uuid4().hex, plano_id, titulo, "", prevista, None, ordem, ancora))
        return obter_plano(db, plano_id)


@app.get("/api/planos")
def listar_planos(q: str = "", status: Literal["ativos", "concluidos", "todos"] = "todos"):
    with conectar() as db:
        ids = db.execute("SELECT id FROM planos WHERE lower(titulo) LIKE ? OR lower(descricao) LIKE ? ORDER BY criado_em DESC", (f"%{q.casefold()}%", f"%{q.casefold()}%")).fetchall()
        planos = [obter_plano(db, x["id"]) for x in ids]
    if status == "ativos": planos = [p for p in planos if p and p["concluidos"] < p["total"]]
    if status == "concluidos": planos = [p for p in planos if p and p["total"] and p["concluidos"] == p["total"]]
    return [{**{k: v for k, v in p.items() if k != "passos"}, "proximo_passo": next((s for s in p["passos"] if not s["concluido_em"]), None)} for p in planos if p]


@app.get("/api/planos/{plano_id}")
def ver_plano(plano_id: str):
    with conectar() as db:
        return obter_plano(db, plano_id) or recurso_ausente()


@app.patch("/api/planos/{plano_id}")
def editar_plano(plano_id: str, entrada: PlanoEdicao):
    dados = entrada.model_dump(exclude_none=True)
    with conectar() as db:
        atual = obter_plano(db, plano_id)
        if not atual: return recurso_ausente()
        if "prazo_final" in dados:
            prazo = dados["prazo_final"]
            if prazo < date.today(): return erro(422, "prazo_no_passado", "O prazo não pode ficar no passado.")
            pendentes = db.execute("SELECT id FROM passos WHERE plano_id=? AND concluido_em IS NULL AND ancora='flexivel' ORDER BY ordem", (plano_id,)).fetchall()
            for linha, nova_data in zip(pendentes, distribuir(date.today(), prazo, len(pendentes)) if pendentes else []):
                db.execute("UPDATE passos SET data_prevista=? WHERE id=?", (nova_data, linha["id"]))
            dados["prazo_final"] = prazo.isoformat()
        for campo, valor in dados.items():
            db.execute(f"UPDATE planos SET {campo}=? WHERE id=?", (valor, plano_id))
        return obter_plano(db, plano_id)


@app.delete("/api/planos/{plano_id}", status_code=204)
def excluir_plano(plano_id: str):
    with conectar() as db:
        if not db.execute("SELECT 1 FROM planos WHERE id=?", (plano_id,)).fetchone(): return recurso_ausente()
        db.execute("DELETE FROM planos WHERE id=?", (plano_id,))
    return Response(status_code=204)


@app.post("/api/planos/{plano_id}/passos", status_code=201)
def criar_passo(plano_id: str, entrada: PassoEntrada):
    with conectar() as db:
        plano = obter_plano(db, plano_id)
        if not plano: return recurso_ausente()
        prevista = entrada.data_prevista or date.fromisoformat(plano["prazo_final"])
        passo_id = uuid.uuid4().hex
        db.execute("INSERT INTO passos VALUES (?,?,?,?,?,?,?,?)", (passo_id, plano_id, entrada.titulo, entrada.detalhe, prevista.isoformat(), None, plano["total"], "rigida" if entrada.ancora else "flexivel"))
        return passo_dict(db.execute("SELECT * FROM passos WHERE id=?", (passo_id,)).fetchone())


@app.patch("/api/planos/{plano_id}/passos/{passo_id}")
def editar_passo(plano_id: str, passo_id: str, entrada: PassoEdicao):
    dados = entrada.model_dump(exclude_none=True)
    with conectar() as db:
        linha = db.execute("SELECT * FROM passos WHERE id=? AND plano_id=?", (passo_id, plano_id)).fetchone()
        if not linha: return recurso_ausente("passo")
        if "concluido" in dados:
            dados["concluido_em"] = agora() if dados.pop("concluido") else None
        if "data_prevista" in dados: dados["data_prevista"] = dados["data_prevista"].isoformat()
        if "ancora" in dados: dados["ancora"] = "rigida" if dados["ancora"] else "flexivel"
        for campo, valor in dados.items(): db.execute(f"UPDATE passos SET {campo}=? WHERE id=?", (valor, passo_id))
        return passo_dict(db.execute("SELECT * FROM passos WHERE id=?", (passo_id,)).fetchone())


@app.delete("/api/planos/{plano_id}/passos/{passo_id}", status_code=204)
def excluir_passo(plano_id: str, passo_id: str):
    with conectar() as db:
        linha = db.execute("SELECT ordem FROM passos WHERE id=? AND plano_id=?", (passo_id, plano_id)).fetchone()
        if not linha: return recurso_ausente("passo")
        db.execute("DELETE FROM passos WHERE id=?", (passo_id,))
        db.execute("UPDATE passos SET ordem=ordem-1 WHERE plano_id=? AND ordem>?", (plano_id, linha["ordem"]))
    return Response(status_code=204)


@app.post("/api/planos/{plano_id}/passos/{passo_id}/adiar")
def adiar_passo(plano_id: str, passo_id: str, entrada: AdiarEntrada):
    with conectar() as db:
        passo = db.execute("SELECT s.*, p.prazo_final FROM passos s JOIN planos p ON p.id=s.plano_id WHERE s.id=? AND s.plano_id=?", (passo_id, plano_id)).fetchone()
        if not passo: return recurso_ausente("passo")
        if passo["ancora"] == "rigida": return erro(409, "data_rigida", "Esse passo tem data rígida. Edite a data se realmente precisar mudá-la.")
        base = max(date.today(), date.fromisoformat(passo["data_prevista"]))
        nova = min(base + timedelta(days=entrada.dias), date.fromisoformat(passo["prazo_final"]))
        db.execute("UPDATE passos SET data_prevista=? WHERE id=?", (nova.isoformat(), passo_id))
        return passo_dict(db.execute("SELECT * FROM passos WHERE id=?", (passo_id,)).fetchone())


@app.put("/api/planos/{plano_id}/ordem")
def reordenar(plano_id: str, entrada: OrdemEntrada):
    with conectar() as db:
        existentes = [x["id"] for x in db.execute("SELECT id FROM passos WHERE plano_id=?", (plano_id,))]
        if not existentes and not db.execute("SELECT 1 FROM planos WHERE id=?", (plano_id,)).fetchone(): return recurso_ausente()
        if len(set(entrada.passos)) != len(entrada.passos) or set(existentes) != set(entrada.passos):
            return erro(422, "ordem_invalida", "Envie todos os passos uma única vez para reordenar.")
        for ordem, passo_id in enumerate(entrada.passos): db.execute("UPDATE passos SET ordem=? WHERE id=?", (ordem, passo_id))
        return obter_plano(db, plano_id)


@app.get("/api/agenda")
def agenda(de: date = Query(default_factory=date.today), ate: date | None = None):
    ate = ate or de + timedelta(days=7)
    if ate < de: return erro(422, "periodo_invalido", "A data final deve ser igual ou posterior à inicial.")
    grupos: dict[str, list] = {"atrasados": [], "periodo": []}
    with conectar() as db:
        linhas = db.execute("SELECT s.*, p.titulo plano_titulo, p.prazo_final FROM passos s JOIN planos p ON p.id=s.plano_id WHERE s.concluido_em IS NULL AND s.data_prevista<=? ORDER BY s.data_prevista,s.ordem", (ate.isoformat(),)).fetchall()
    for linha in linhas:
        prevista = date.fromisoformat(linha["data_prevista"])
        grupo = "atrasados" if prevista < de else "periodo"
        grupos[grupo].append({**passo_dict(linha), "plano_id": linha["plano_id"], "plano_titulo": linha["plano_titulo"], "prazo_final": linha["prazo_final"]})
    return grupos


@app.get("/api/planos/{plano_id}/exportacao")
def exportar(plano_id: str, formato: Literal["markdown", "html"] = "markdown"):
    with conectar() as db: plano = obter_plano(db, plano_id)
    if not plano: return recurso_ausente()
    if formato == "html":
        itens = "".join(f"<li>{'✓' if p['concluido_em'] else '☐'} {html.escape(p['data_prevista'])} — {html.escape(p['titulo'])}</li>" for p in plano["passos"])
        corpo = f"<!doctype html><meta charset=utf-8><title>{html.escape(plano['titulo'])}</title><h1>{html.escape(plano['titulo'])}</h1><p>{html.escape(plano['descricao'])}</p><ul>{itens}</ul>"
        return Response(corpo, media_type="text/html", headers={"Content-Disposition": f'attachment; filename="plano-{plano_id[:8]}.html"'})
    linhas = [f"# {plano['titulo']}", "", plano["descricao"], "", f"Prazo final: {plano['prazo_final']}", ""] + [f"- [{'x' if p['concluido_em'] else ' '}] {p['data_prevista']} — {p['titulo']}" for p in plano["passos"]]
    return Response("\n".join(linhas), media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="plano-{plano_id[:8]}.md"'})
