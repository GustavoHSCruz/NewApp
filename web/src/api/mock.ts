/**
 * Mock de desenvolvimento do front. NÃO é o produto.
 * Existe só para eu (front) conseguir trabalhar antes da API subir e para
 * `npm run dev:mock` funcionar sem Python. O motor de verdade vive em `api/`.
 */
import type { Agenda, EdicaoPasso, ItemAgenda, Licenca, Modelo, NovoPlano, Passo, Plano, Preparo, ResumoPlano } from './tipos'
import { ErroApi } from './tipos'
import type { Api } from './cliente'

const CHAVE = 'clareia.mock.v1'
const CHAVE_LICENCA = 'clareia.mock.licenca'
const CHAVE_MODELOS = 'clareia.mock.modelos'

const hoje = () => new Date().toISOString().slice(0, 10)
const dias = (base: string, n: number) => {
  const d = new Date(`${base}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const id = () => Math.random().toString(36).slice(2, 10)

function ler(): Plano[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') } catch { return [] }
}
function gravar(planos: Plano[]) {
  localStorage.setItem(CHAVE, JSON.stringify(planos))
}
function contar(p: Plano): Plano {
  p.passos.sort((a, b) => a.ordem - b.ordem)
  p.total = p.passos.length
  p.concluidos = p.passos.filter((s) => s.concluido_em).length
  return p
}

const MODELOS: Record<string, { rotulo: string; gatilhos: string[]; perguntas: Preparo['perguntas']; passos: string[] }> = {
  mudanca: {
    rotulo: 'Mudança',
    gatilhos: ['mudan', 'apartamento', 'casa nova', 'mudar'],
    perguntas: [
      { id: 'comodos', rotulo: 'Quantos cômodos você precisa embalar?', tipo: 'escolha', opcoes: ['1 ou 2', '3 ou 4', '5 ou mais'] },
      { id: 'frete', rotulo: 'Já tem transportadora contratada?', tipo: 'sim_nao' },
    ],
    passos: ['Descartar o que não vai junto', 'Pedir três orçamentos de frete', 'Fechar a transportadora',
      'Comprar caixas e fita', 'Embalar o que você não usa toda semana', 'Avisar a portaria e agendar o elevador',
      'Transferir luz, água e internet', 'Embalar o resto', 'Dia da mudança', 'Conferir o que chegou e montar o essencial'],
  },
  entrevista: {
    rotulo: 'Entrevista',
    gatilhos: ['entrevista', 'vaga', 'emprego', 'processo seletivo'],
    perguntas: [
      { id: 'cargo', rotulo: 'Qual é a vaga?', tipo: 'texto' },
      { id: 'tecnica', rotulo: 'Tem etapa técnica?', tipo: 'sim_nao' },
    ],
    passos: ['Estudar a empresa e o produto', 'Reescrever seu currículo para essa vaga',
      'Listar 5 histórias suas com resultado concreto', 'Treinar as respostas em voz alta',
      'Preparar 3 perguntas para eles', 'Testar câmera, microfone e link', 'Dormir cedo na véspera', 'Entrevista'],
  },
  documentos: {
    rotulo: 'Documentos',
    gatilhos: ['documento', 'cpf', 'cnh', 'passaporte', 'certidão', 'regulariz'],
    perguntas: [
      { id: 'qual', rotulo: 'Qual documento?', tipo: 'texto' },
      { id: 'presencial', rotulo: 'Precisa ir presencialmente?', tipo: 'sim_nao' },
    ],
    passos: ['Descobrir exatamente o que é exigido', 'Juntar os documentos que você já tem',
      'Providenciar o que falta', 'Pagar a taxa', 'Agendar o atendimento', 'Comparecer', 'Acompanhar e retirar'],
  },
  generico: {
    rotulo: 'Geral',
    gatilhos: [],
    perguntas: [
      { id: 'primeiro', rotulo: 'Qual é a primeira coisa que precisa acontecer?', tipo: 'texto' },
      { id: 'sozinho', rotulo: 'Você depende de outra pessoa para concluir?', tipo: 'sim_nao' },
    ],
    passos: ['Escrever o que "pronto" significa aqui', 'Levantar o que você já tem',
      'Descobrir o que falta', 'Fazer a parte mais difícil', 'Revisar', 'Concluir'],
  },
}

function classificar(descricao: string) {
  const t = descricao.toLowerCase()
  for (const [chave, m] of Object.entries(MODELOS)) {
    if (m.gatilhos.some((g) => t.includes(g))) return chave
  }
  return 'generico'
}

const espera = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120))

function lerLicenca(): Licenca {
  let apoiador: Licenca['apoiador'] = null
  try { apoiador = JSON.parse(localStorage.getItem(CHAVE_LICENCA) ?? 'null') } catch { apoiador = null }
  return {
    ativa: !!apoiador,
    apoiador,
    checkout_url: null,
    preco: { valor: 39, moeda: 'BRL', tipo: 'pagamento_unico' },
  }
}
function lerModelos(): Modelo[] {
  try { return JSON.parse(localStorage.getItem(CHAVE_MODELOS) ?? '[]') } catch { return [] }
}
function exigirApoiador() {
  if (!lerLicenca().ativa) {
    throw new ErroApi('recurso_apoiador', 'Modelos próprios fazem parte do Clareia Apoiador.', 403)
  }
}

export const apiMock: Api = {
  saude: () => espera({ versao: 'mock', ollama: false }),
  listarPlanos: (f) => {
    let planos = ler().map(contar)
    if (f?.q) planos = planos.filter((p) => p.titulo.toLowerCase().includes(f.q!.toLowerCase()))
    if (f?.status === 'ativos') planos = planos.filter((p) => p.concluidos < p.total)
    if (f?.status === 'concluidos') planos = planos.filter((p) => p.total > 0 && p.concluidos === p.total)
    const resumos: ResumoPlano[] = planos.map(({ passos, ...resto }) => ({
      ...resto,
      proximo_passo: passos.find((s) => !s.concluido_em) ?? null,
    }))
    return espera(resumos)
  },
  obterPlano: (pid) => {
    const p = ler().find((x) => x.id === pid)
    if (!p) throw new ErroApi('nao_encontrado', 'Esse plano não existe mais.', 404)
    return espera(contar(p))
  },
  prepararPlano: ({ descricao }) => {
    const cat = classificar(descricao)
    const m = MODELOS[cat]
    return espera({
      categoria: cat,
      titulo_sugerido: descricao.trim().slice(0, 60).replace(/^./, (c) => c.toUpperCase()),
      perguntas: m.perguntas,
    })
  },
  criarPlano: (dados: NovoPlano) => {
    const cat = dados.categoria ?? classificar(dados.descricao)
    const m = MODELOS[cat] ?? MODELOS.generico
    const inicio = hoje()
    const fim = dados.prazo_final
    const total = m.passos.length
    const vao = Math.max(1, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000))
    const passos: Passo[] = m.passos.map((titulo, i) => ({
      id: id(),
      titulo,
      detalhe: '',
      data_prevista: dias(inicio, Math.round(((i + 1) / total) * vao)),
      concluido_em: null,
      ordem: i,
      ancora: i === total - 1,
    }))
    const plano: Plano = contar({
      id: id(),
      titulo: dados.titulo ?? dados.descricao.slice(0, 60),
      descricao: dados.descricao,
      categoria: cat,
      prazo_final: fim,
      criado_em: new Date().toISOString(),
      passos,
      total: 0,
      concluidos: 0,
    })
    const todos = ler()
    todos.push(plano)
    gravar(todos)
    return espera(plano)
  },
  atualizarPlano: (pid, d) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    Object.assign(p, d)
    gravar(todos)
    return espera(contar(p))
  },
  excluirPlano: (pid) => {
    gravar(ler().filter((x) => x.id !== pid))
    return espera(undefined)
  },
  agenda: (de, ate) => {
    const atrasados: ItemAgenda[] = []
    const periodo: ItemAgenda[] = []
    for (const p of ler()) {
      for (const passo of p.passos) {
        if (passo.concluido_em) continue
        const item: ItemAgenda = { ...passo, plano_id: p.id, plano_titulo: p.titulo, prazo_final: p.prazo_final }
        if (passo.data_prevista < de) atrasados.push(item)
        else if (passo.data_prevista <= ate) periodo.push(item)
      }
    }
    const ordenar = (l: ItemAgenda[]) => l.sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))
    return espera({ atrasados: ordenar(atrasados), periodo: ordenar(periodo) } as Agenda)
  },
  criarPasso: (pid, d) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    const passo: Passo = {
      id: id(), titulo: d.titulo, detalhe: d.detalhe ?? '', data_prevista: d.data_prevista ?? p.prazo_final,
      concluido_em: null, ordem: p.passos.length, ancora: false,
    }
    p.passos.push(passo)
    gravar(todos)
    return espera(passo)
  },
  editarPasso: (pid, sid, d: EdicaoPasso) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    const s = p.passos.find((x) => x.id === sid)!
    if (d.titulo !== undefined) s.titulo = d.titulo
    if (d.detalhe !== undefined) s.detalhe = d.detalhe
    if (d.data_prevista !== undefined) s.data_prevista = d.data_prevista
    if (d.concluido !== undefined) s.concluido_em = d.concluido ? new Date().toISOString() : null
    if (d.ancora !== undefined) s.ancora = d.ancora
    gravar(todos)
    return espera(s)
  },
  excluirPasso: (pid, sid) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    p.passos = p.passos.filter((x) => x.id !== sid)
    p.passos.forEach((x, i) => (x.ordem = i))
    gravar(todos)
    return espera(undefined)
  },
  adiarPasso: (pid, sid, n) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    const s = p.passos.find((x) => x.id === sid)!
    const base = s.data_prevista < hoje() ? hoje() : s.data_prevista
    s.data_prevista = dias(base, n)
    gravar(todos)
    return espera(s)
  },
  reordenar: (pid, ordem) => {
    const todos = ler()
    const p = todos.find((x) => x.id === pid)!
    p.passos.forEach((s) => (s.ordem = ordem.indexOf(s.id)))
    gravar(todos)
    return espera(contar(p))
  },
  licenca: () => espera(lerLicenca()),
  ativarLicenca: (chave) => {
    if (!chave.trim().startsWith('CLA1') || chave.trim().length < 20) {
      throw new ErroApi('licenca_invalida', 'Essa chave não é válida. Confira se ela foi copiada inteira.', 422)
    }
    localStorage.setItem(CHAVE_LICENCA, JSON.stringify({ nome: 'Apoiador de demonstração', email: null, id: 'demo' }))
    return espera(lerLicenca())
  },
  removerLicenca: () => {
    localStorage.removeItem(CHAVE_LICENCA)
    return espera(undefined)
  },
  listarModelos: () => {
    exigirApoiador()
    return espera(lerModelos())
  },
  salvarModelo: (planoId, nome) => {
    exigirApoiador()
    const p = ler().find((x) => x.id === planoId)!
    const modelo: Modelo = {
      id: id(), nome, descricao: p.descricao, categoria: p.categoria, criado_em: new Date().toISOString(),
      passos: p.passos.map((s) => ({ titulo: s.titulo, detalhe: s.detalhe, ancora: s.ancora })),
    }
    const todos = lerModelos()
    todos.unshift(modelo)
    localStorage.setItem(CHAVE_MODELOS, JSON.stringify(todos))
    return espera(modelo)
  },
  usarModelo: (modeloId, d) => {
    exigirApoiador()
    const m = lerModelos().find((x) => x.id === modeloId)!
    const inicio = hoje()
    const total = m.passos.length
    const vao = Math.max(1, Math.round((new Date(d.prazo_final).getTime() - new Date(inicio).getTime()) / 86400000))
    const plano: Plano = contar({
      id: id(), titulo: d.titulo ?? m.nome, descricao: d.descricao ?? m.descricao, categoria: m.categoria,
      prazo_final: d.prazo_final, criado_em: new Date().toISOString(), total: 0, concluidos: 0,
      passos: m.passos.map((p, i) => ({
        id: id(), titulo: p.titulo, detalhe: p.detalhe, ancora: p.ancora, concluido_em: null, ordem: i,
        data_prevista: dias(inicio, Math.round(((i + 1) / total) * vao)),
      })),
    })
    const todos = ler()
    todos.push(plano)
    gravar(todos)
    return espera(plano)
  },
  excluirModelo: (modeloId) => {
    exigirApoiador()
    localStorage.setItem(CHAVE_MODELOS, JSON.stringify(lerModelos().filter((x) => x.id !== modeloId)))
    return espera(undefined)
  },
  urlExportacao: (pid) => {
    const p = ler().find((x) => x.id === pid)
    const texto = p
      ? [`# ${p.titulo}`, '', ...p.passos.map((s) => `- [${s.concluido_em ? 'x' : ' '}] ${s.data_prevista} — ${s.titulo}`)].join('\n')
      : ''
    return URL.createObjectURL(new Blob([texto], { type: 'text/markdown' }))
  },
}
