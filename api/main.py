from __future__ import annotations

import html
import json
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
from .licenca import checkout_url, verificar as verificar_licenca

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


class LicencaEntrada(Modelo):
    chave: str = Field(min_length=20, max_length=5000)


class ModeloEntrada(Modelo):
    plano_id: str
    nome: str = Field(min_length=1, max_length=100)


class UsarModeloEntrada(Modelo):
    titulo: str | None = Field(default=None, max_length=100)
    descricao: str | None = Field(default=None, max_length=1000)
    prazo_final: date


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


def dados_licenca(db: sqlite3.Connection) -> dict[str, Any] | None:
    linha = db.execute("SELECT valor FROM configuracoes WHERE chave='licenca_apoiador'").fetchone()
    return verificar_licenca(linha["valor"]) if linha else None


def estado_licenca(db: sqlite3.Connection) -> dict[str, Any]:
    dados = dados_licenca(db)
    return {"ativa": bool(dados), "apoiador": {"nome": dados.get("nome"), "email": dados.get("email"), "id": dados.get("id")} if dados else None, "checkout_url": checkout_url(), "preco": {"valor": 39, "moeda": "BRL", "tipo": "pagamento_unico"}}


@app.get("/api/licenca")
def consultar_licenca():
    with conectar() as db: return estado_licenca(db)


@app.post("/api/licenca")
def ativar_licenca(entrada: LicencaEntrada):
    dados = verificar_licenca(entrada.chave)
    if not dados: return erro(422, "licenca_invalida", "Essa chave não é válida. Confira se ela foi copiada inteira.")
    with conectar() as db:
        db.execute("INSERT INTO configuracoes(chave,valor) VALUES('licenca_apoiador',?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor", (entrada.chave.strip(),))
        return estado_licenca(db)


@app.delete("/api/licenca", status_code=204)
def desativar_licenca():
    with conectar() as db: db.execute("DELETE FROM configuracoes WHERE chave='licenca_apoiador'")
    return Response(status_code=204)


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
            prazo_anterior = atual["prazo_final"]
            pendentes = db.execute("SELECT id FROM passos WHERE plano_id=? AND concluido_em IS NULL AND ancora='flexivel' ORDER BY ordem", (plano_id,)).fetchall()
            for linha, nova_data in zip(pendentes, distribuir(date.today(), prazo, len(pendentes)) if pendentes else []):
                db.execute("UPDATE passos SET data_prevista=? WHERE id=?", (nova_data, linha["id"]))
            db.execute("UPDATE passos SET data_prevista=? WHERE plano_id=? AND concluido_em IS NULL AND ancora='rigida' AND data_prevista=?", (prazo.isoformat(), plano_id, prazo_anterior))
            db.execute("UPDATE passos SET data_prevista=? WHERE plano_id=? AND concluido_em IS NULL AND data_prevista>?", (prazo.isoformat(), plano_id, prazo.isoformat()))
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


@app.get("/api/modelos")
def listar_modelos():
    with conectar() as db:
        if not dados_licenca(db): return erro(403, "recurso_apoiador", "Modelos próprios fazem parte do Clareia Apoiador.")
        linhas = db.execute("SELECT * FROM modelos ORDER BY criado_em DESC").fetchall()
    return [{**{k: x[k] for k in ("id", "nome", "descricao", "categoria", "criado_em")}, "passos": json.loads(x["passos_json"])} for x in linhas]


@app.post("/api/modelos", status_code=201)
def salvar_modelo(entrada: ModeloEntrada):
    with conectar() as db:
        if not dados_licenca(db): return erro(403, "recurso_apoiador", "Modelos próprios fazem parte do Clareia Apoiador.")
        plano = obter_plano(db, entrada.plano_id)
        if not plano: return recurso_ausente()
        modelo_id = uuid.uuid4().hex
        passos = [{"titulo": p["titulo"], "detalhe": p["detalhe"], "ancora": p["ancora"]} for p in plano["passos"]]
        db.execute("INSERT INTO modelos VALUES (?,?,?,?,?,?)", (modelo_id, entrada.nome, plano["descricao"], plano["categoria"], json.dumps(passos, ensure_ascii=False), agora()))
        return {"id": modelo_id, "nome": entrada.nome, "descricao": plano["descricao"], "categoria": plano["categoria"], "passos": passos, "criado_em": agora()}


@app.post("/api/modelos/{modelo_id}/usar", status_code=201)
def usar_modelo(modelo_id: str, entrada: UsarModeloEntrada):
    if entrada.prazo_final < date.today(): return erro(422, "prazo_no_passado", "Escolha hoje ou uma data futura.")
    with conectar() as db:
        if not dados_licenca(db): return erro(403, "recurso_apoiador", "Modelos próprios fazem parte do Clareia Apoiador.")
        modelo = db.execute("SELECT * FROM modelos WHERE id=?", (modelo_id,)).fetchone()
        if not modelo: return recurso_ausente("modelo")
        passos = json.loads(modelo["passos_json"])
        datas = distribuir(date.today(), entrada.prazo_final, len(passos))
        plano_id = uuid.uuid4().hex
        descricao = entrada.descricao or modelo["descricao"]
        db.execute("INSERT INTO planos VALUES (?,?,?,?,?,?)", (plano_id, entrada.titulo or modelo["nome"], descricao, modelo["categoria"], entrada.prazo_final.isoformat(), agora()))
        for ordem, (passo, prevista) in enumerate(zip(passos, datas)):
            db.execute("INSERT INTO passos VALUES (?,?,?,?,?,?,?,?)", (uuid.uuid4().hex, plano_id, passo["titulo"], passo.get("detalhe", ""), prevista, None, ordem, "rigida" if passo.get("ancora") else "flexivel"))
        return obter_plano(db, plano_id)


@app.delete("/api/modelos/{modelo_id}", status_code=204)
def excluir_modelo(modelo_id: str):
    with conectar() as db:
        if not dados_licenca(db): return erro(403, "recurso_apoiador", "Modelos próprios fazem parte do Clareia Apoiador.")
        if not db.execute("SELECT 1 FROM modelos WHERE id=?", (modelo_id,)).fetchone(): return recurso_ausente("modelo")
        db.execute("DELETE FROM modelos WHERE id=?", (modelo_id,))
    return Response(status_code=204)


def escapar_ics(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@app.get("/api/planos/{plano_id}/exportacao")
def exportar(plano_id: str, formato: Literal["markdown", "html", "ics"] = "markdown", capa: bool = False):
    with conectar() as db:
        plano = obter_plano(db, plano_id)
        apoiador = bool(dados_licenca(db))
    if not plano: return recurso_ausente()
    if formato == "ics":
        if not apoiador: return erro(403, "recurso_apoiador", "Enviar para o calendário faz parte do Clareia Apoiador.")
        linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Clareia//Apoiador//PT-BR", "CALSCALE:GREGORIAN"]
        for passo in plano["passos"]:
            inicio = date.fromisoformat(passo["data_prevista"])
            linhas += ["BEGIN:VEVENT", f"UID:{passo['id']}@clareia.local", f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}", f"DTSTART;VALUE=DATE:{inicio.strftime('%Y%m%d')}", f"DTEND;VALUE=DATE:{(inicio + timedelta(days=1)).strftime('%Y%m%d')}", f"SUMMARY:{escapar_ics(passo['titulo'])}", f"DESCRIPTION:{escapar_ics(plano['titulo'] + (' — ' + passo['detalhe'] if passo['detalhe'] else ''))}", "BEGIN:VALARM", "TRIGGER:-PT9H", "ACTION:DISPLAY", f"DESCRIPTION:{escapar_ics(passo['titulo'])}", "END:VALARM", "END:VEVENT"]
        linhas.append("END:VCALENDAR")
        return Response("\r\n".join(linhas) + "\r\n", media_type="text/calendar", headers={"Content-Disposition": f'attachment; filename="calendario-{plano_id[:8]}.ics"'})
    if formato == "html":
        if capa and not apoiador: return erro(403, "recurso_apoiador", "A capa personalizada faz parte do Clareia Apoiador.")
        itens = "".join(f"<li>{'✓' if p['concluido_em'] else '☐'} {html.escape(p['data_prevista'])} — {html.escape(p['titulo'])}</li>" for p in plano["passos"])
        abertura = f"<section class='capa'><small>PLANO CLAREIA</small><h1>{html.escape(plano['titulo'])}</h1><p>{html.escape(plano['descricao'])}</p><strong>Prazo: {html.escape(plano['prazo_final'])}</strong></section>" if capa else f"<h1>{html.escape(plano['titulo'])}</h1><p>{html.escape(plano['descricao'])}</p>"
        estilo = "<style>body{font:16px system-ui;max-width:800px;margin:3rem auto;color:#18231d}.capa{min-height:80vh;display:flex;flex-direction:column;justify-content:center;border-left:12px solid #e2a52c;padding:3rem;page-break-after:always}.capa h1{font-size:3rem}li{margin:.7rem 0}@media print{body{margin:0}.capa{min-height:90vh}}</style>"
        corpo = f"<!doctype html><html lang='pt-BR'><meta charset=utf-8><title>{html.escape(plano['titulo'])}</title>{estilo}<body>{abertura}<h2>Etapas</h2><ul>{itens}</ul></body></html>"
        return Response(corpo, media_type="text/html", headers={"Content-Disposition": f'attachment; filename="plano-{plano_id[:8]}.html"'})
    linhas = [f"# {plano['titulo']}", "", plano["descricao"], "", f"Prazo final: {plano['prazo_final']}", ""] + [f"- [{'x' if p['concluido_em'] else ' '}] {p['data_prevista']} — {p['titulo']}" for p in plano["passos"]]
    return Response("\n".join(linhas), media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="plano-{plano_id[:8]}.md"'})
