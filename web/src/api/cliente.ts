import type {
  Agenda, EdicaoPasso, Licenca, Modelo, NovoPlano, Passo, Plano, Preparo, ResumoPlano, Saude, StatusFiltro,
} from './tipos'
import { ErroApi } from './tipos'
import { apiMock } from './mock'

export const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8787'
const USAR_MOCK = (import.meta.env.VITE_MOCK as string | undefined) === '1'

async function req<T>(caminho: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ErroApi(
      'sem_conexao',
      'Não consegui falar com o Clareia que roda no seu computador. Ele pode ter sido fechado — feche esta aba e abra o Clareia de novo.',
      0,
    )
  }
  if (r.status === 204) return undefined as T
  const texto = await r.text()
  const corpo = texto ? JSON.parse(texto) : null
  if (!r.ok) {
    const e = corpo?.erro
    throw new ErroApi(e?.codigo ?? 'erro', e?.mensagem ?? 'Algo deu errado por aqui.', r.status)
  }
  return corpo as T
}

export interface Api {
  saude(): Promise<Saude>
  listarPlanos(filtro?: { q?: string; status?: StatusFiltro }): Promise<ResumoPlano[]>
  obterPlano(id: string): Promise<Plano>
  prepararPlano(dados: { descricao: string; prazo_final: string }): Promise<Preparo>
  criarPlano(dados: NovoPlano): Promise<Plano>
  atualizarPlano(id: string, dados: Partial<Pick<Plano, 'titulo' | 'descricao' | 'prazo_final'>>): Promise<Plano>
  excluirPlano(id: string): Promise<void>
  agenda(de: string, ate: string): Promise<Agenda>
  criarPasso(planoId: string, dados: { titulo: string; detalhe?: string; data_prevista?: string }): Promise<Passo>
  editarPasso(planoId: string, passoId: string, dados: EdicaoPasso): Promise<Passo>
  excluirPasso(planoId: string, passoId: string): Promise<void>
  adiarPasso(planoId: string, passoId: string, dias: number): Promise<Passo>
  reordenar(planoId: string, passos: string[]): Promise<Plano>
  urlExportacao(id: string, formato: 'markdown' | 'html' | 'ics', capa?: boolean): string
  licenca(): Promise<Licenca>
  ativarLicenca(chave: string): Promise<Licenca>
  removerLicenca(): Promise<void>
  listarModelos(): Promise<Modelo[]>
  salvarModelo(planoId: string, nome: string): Promise<Modelo>
  usarModelo(modeloId: string, dados: { titulo?: string; descricao?: string; prazo_final: string }): Promise<Plano>
  excluirModelo(modeloId: string): Promise<void>
}

/** A API responde 403 recurso_apoiador quando falta licença. */
export const ehRecursoDeApoiador = (e: unknown) =>
  e instanceof ErroApi && e.codigo === 'recurso_apoiador'

const apiHttp: Api = {
  saude: () => req('/api/saude'),
  listarPlanos: (f) => {
    const p = new URLSearchParams()
    if (f?.q) p.set('q', f.q)
    if (f?.status) p.set('status', f.status)
    const qs = p.toString()
    return req(`/api/planos${qs ? `?${qs}` : ''}`)
  },
  obterPlano: (id) => req(`/api/planos/${id}`),
  prepararPlano: (d) => req('/api/planos/preparar', { method: 'POST', body: JSON.stringify(d) }),
  criarPlano: (d) => req('/api/planos', { method: 'POST', body: JSON.stringify(d) }),
  atualizarPlano: (id, d) => req(`/api/planos/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  excluirPlano: (id) => req(`/api/planos/${id}`, { method: 'DELETE' }),
  agenda: (de, ate) => req(`/api/agenda?de=${de}&ate=${ate}`),
  criarPasso: (p, d) => req(`/api/planos/${p}/passos`, { method: 'POST', body: JSON.stringify(d) }),
  editarPasso: (p, s, d) => req(`/api/planos/${p}/passos/${s}`, { method: 'PATCH', body: JSON.stringify(d) }),
  excluirPasso: (p, s) => req(`/api/planos/${p}/passos/${s}`, { method: 'DELETE' }),
  adiarPasso: (p, s, dias) =>
    req(`/api/planos/${p}/passos/${s}/adiar`, { method: 'POST', body: JSON.stringify({ dias }) }),
  reordenar: (p, passos) => req(`/api/planos/${p}/ordem`, { method: 'PUT', body: JSON.stringify({ passos }) }),
  urlExportacao: (id, formato, capa) =>
    `${BASE}/api/planos/${id}/exportacao?formato=${formato}${capa ? '&capa=true' : ''}`,
  licenca: () => req('/api/licenca'),
  ativarLicenca: (chave) => req('/api/licenca', { method: 'POST', body: JSON.stringify({ chave }) }),
  removerLicenca: () => req('/api/licenca', { method: 'DELETE' }),
  listarModelos: () => req('/api/modelos'),
  salvarModelo: (plano_id, nome) => req('/api/modelos', { method: 'POST', body: JSON.stringify({ plano_id, nome }) }),
  usarModelo: (id, dados) => req(`/api/modelos/${id}/usar`, { method: 'POST', body: JSON.stringify(dados) }),
  excluirModelo: (id) => req(`/api/modelos/${id}`, { method: 'DELETE' }),
}

export const api: Api = USAR_MOCK ? apiMock : apiHttp
export const usandoMock = USAR_MOCK
