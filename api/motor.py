from __future__ import annotations

import json
import re
import urllib.request
from datetime import date, timedelta
from typing import Any

MODELOS: dict[str, dict[str, Any]] = {
    "mudanca": {"gatilhos": ["mudan", "casa nova", "apartamento novo"], "perguntas": [
        {"id": "comodos", "rotulo": "Quantos cômodos você precisa embalar?", "tipo": "escolha", "opcoes": ["1 ou 2", "3 ou 4", "5 ou mais"], "obrigatoria": False},
        {"id": "frete", "rotulo": "Já tem transportadora contratada?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Separar o que vai, doa ou descarta", "Pedir orçamentos de transporte", "Contratar o transporte", "Providenciar caixas e etiquetas", "Embalar itens menos usados", "Atualizar endereço e serviços", "Agendar elevador ou acesso", "Embalar os itens essenciais", "Realizar a mudança", "Conferir volumes e organizar o essencial"]},
    "entrevista": {"gatilhos": ["entrevista", "vaga", "emprego", "processo seletivo"], "perguntas": [
        {"id": "cargo", "rotulo": "Qual é a vaga?", "tipo": "texto", "opcoes": [], "obrigatoria": False},
        {"id": "tecnica", "rotulo": "Existe uma etapa técnica?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Pesquisar a empresa e a vaga", "Adaptar o currículo para a vaga", "Separar histórias com resultados concretos", "Revisar os temas técnicos", "Treinar respostas em voz alta", "Preparar perguntas para a empresa", "Testar câmera, áudio e acesso", "Participar da entrevista"]},
    "documentos": {"gatilhos": ["document", "cpf", "cnh", "passaporte", "certidão", "regulariz"], "perguntas": [
        {"id": "qual", "rotulo": "Qual documento você precisa resolver?", "tipo": "texto", "opcoes": [], "obrigatoria": False},
        {"id": "presencial", "rotulo": "Há atendimento presencial?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Confirmar requisitos no órgão responsável", "Separar documentos disponíveis", "Providenciar documentos faltantes", "Pagar taxas necessárias", "Agendar o atendimento", "Comparecer ou enviar a solicitação", "Acompanhar o andamento", "Conferir e guardar o documento"]},
    "viagem": {"gatilhos": ["viagem", "viajar", "férias", "ferias"], "perguntas": [
        {"id": "destino", "rotulo": "Qual é o destino?", "tipo": "texto", "opcoes": [], "obrigatoria": False},
        {"id": "internacional", "rotulo": "É uma viagem internacional?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Definir orçamento disponível", "Conferir documentos e validade", "Reservar transporte", "Reservar hospedagem", "Planejar deslocamentos e passeios", "Contratar seguro se necessário", "Preparar bagagem e documentos", "Fazer check-in", "Iniciar a viagem"]},
    "evento": {"gatilhos": ["festa", "evento", "casamento", "aniversário", "aniversario"], "perguntas": [
        {"id": "pessoas", "rotulo": "Para quantas pessoas?", "tipo": "numero", "opcoes": [], "obrigatoria": False},
        {"id": "local", "rotulo": "O local já está definido?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Definir orçamento e quantidade de pessoas", "Escolher e reservar o local", "Montar a lista de convidados", "Contratar os serviços principais", "Enviar convites", "Confirmar fornecedores", "Organizar materiais e pagamentos", "Fazer a conferência final", "Realizar o evento"]},
    "generico": {"gatilhos": [], "perguntas": [
        {"id": "primeiro", "rotulo": "Qual é a primeira coisa que precisa acontecer?", "tipo": "texto", "opcoes": [], "obrigatoria": False},
        {"id": "dependencia", "rotulo": "Você depende de outra pessoa?", "tipo": "sim_nao", "opcoes": [], "obrigatoria": False}],
        "passos": ["Definir claramente o resultado esperado", "Levantar o que já está disponível", "Listar o que ainda falta", "Resolver a principal dependência", "Executar a parte central", "Revisar o resultado", "Fazer os ajustes finais", "Concluir e guardar os registros"]},
}


def classificar(descricao: str) -> str:
    texto = descricao.casefold()
    return next((chave for chave, modelo in MODELOS.items() if any(g in texto for g in modelo["gatilhos"])), "generico")


def titulo_sugerido(descricao: str) -> str:
    limpo = re.sub(r"\s+", " ", descricao).strip(" .")
    return (limpo[:57] + "…" if len(limpo) > 60 else limpo).capitalize()


def preparar(descricao: str) -> dict[str, Any]:
    categoria = classificar(descricao)
    return {"categoria": categoria, "titulo_sugerido": titulo_sugerido(descricao), "perguntas": MODELOS[categoria]["perguntas"]}


def distribuir(inicio: date, fim: date, quantidade: int) -> list[str]:
    intervalo = max(0, (fim - inicio).days)
    return [(inicio + timedelta(days=round(intervalo * (i + 1) / quantidade))).isoformat() for i in range(quantidade)]


def passos_deterministicos(categoria: str, respostas: dict[str, Any]) -> list[str]:
    passos = list(MODELOS.get(categoria, MODELOS["generico"])["passos"])
    primeiro = str(respostas.get("primeiro", "")).strip()
    if primeiro and categoria == "generico":
        passos[0] = primeiro[:160]
    if respostas.get("frete") is True and categoria == "mudanca":
        passos = [p for p in passos if p not in {"Pedir orçamentos de transporte", "Contratar o transporte"}]
    return passos


def ollama_disponivel() -> tuple[bool, str | None]:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=.35) as resposta:
            modelos = json.load(resposta).get("models", [])
        return bool(modelos), modelos[0].get("name") if modelos else None
    except Exception:
        return False, None


def enriquecer_com_ollama(descricao: str, categoria: str, respostas: dict[str, Any]) -> list[str] | None:
    disponivel, modelo = ollama_disponivel()
    if not disponivel or not modelo:
        return None
    prompt = "Crie de 6 a 10 passos curtos e concretos em pt-BR. Responda SOMENTE array JSON de strings. Objetivo: " + descricao + ". Contexto: " + json.dumps(respostas, ensure_ascii=False)
    corpo = json.dumps({"model": modelo, "prompt": prompt, "stream": False, "format": "json"}).encode()
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/generate", data=corpo, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=45) as resposta:
            dados = json.loads(json.load(resposta).get("response", "[]"))
        if isinstance(dados, dict):
            dados = dados.get("passos", [])
        passos = [str(p).strip()[:160] for p in dados if str(p).strip()]
        return passos if 3 <= len(passos) <= 15 else None
    except Exception:
        return None
