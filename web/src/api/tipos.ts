/** Tipos do contrato HTTP com a API. Fonte da verdade: CONTRATO-API.md (raiz). */

export type TipoPergunta = 'escolha' | 'texto' | 'numero' | 'data' | 'sim_nao'

export interface Pergunta {
  id: string
  rotulo: string
  tipo: TipoPergunta
  opcoes?: string[]
  obrigatoria?: boolean
}

export interface Preparo {
  categoria: string
  titulo_sugerido: string
  perguntas: Pergunta[]
}

export interface Passo {
  id: string
  titulo: string
  detalhe: string
  data_prevista: string
  concluido_em: string | null
  ordem: number
  /** true = data presa a uma regra do mundo real; false = o motor pode mover. */
  ancora: boolean
}

export interface Plano {
  id: string
  titulo: string
  descricao: string
  categoria: string
  prazo_final: string
  criado_em: string
  passos: Passo[]
  total: number
  concluidos: number
}

export type ResumoPlano = Omit<Plano, 'passos'> & { proximo_passo: Passo | null }

/** Item da agenda: o passo, mais de qual plano ele veio. */
export type ItemAgenda = Passo & {
  plano_id: string
  plano_titulo: string
  prazo_final: string
}

export interface Agenda {
  atrasados: ItemAgenda[]
  periodo: ItemAgenda[]
}

export interface Saude {
  versao: string
  ollama: boolean
}

export interface NovoPlano {
  descricao: string
  prazo_final: string
  categoria?: string
  titulo?: string
  respostas?: Record<string, unknown>
  usar_ollama?: boolean
}

export interface EdicaoPasso {
  titulo?: string
  detalhe?: string
  data_prevista?: string
  concluido?: boolean
  ancora?: boolean
}

export type StatusFiltro = 'ativos' | 'concluidos' | 'todos'

/** Erro em formato único: { erro: { codigo, mensagem } } */
export class ErroApi extends Error {
  codigo: string
  status: number
  constructor(codigo: string, mensagem: string, status: number) {
    super(mensagem)
    this.codigo = codigo
    this.status = status
  }
}
