export type Tema = 'claro' | 'escuro' | 'sistema' | 'sepia' | 'carvao'

const CHAVE = 'clareia.tema'
/** Temas que fazem parte do Clareia Apoiador. */
export const TEMAS_DE_APOIADOR: Tema[] = ['sepia', 'carvao']

const valido = (t: string | null): t is Tema =>
  t === 'claro' || t === 'escuro' || t === 'sepia' || t === 'carvao'

export function temaSalvo(): Tema {
  const t = localStorage.getItem(CHAVE)
  return valido(t) ? t : 'sistema'
}

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') {
    raiz.dataset.tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
    localStorage.removeItem(CHAVE)
    return
  }
  raiz.dataset.tema = tema
  localStorage.setItem(CHAVE, tema)
}

export function iniciarTema() {
  aplicarTema(temaSalvo())
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (temaSalvo() === 'sistema') aplicarTema('sistema')
  })
}

/** Sem licença, um tema de apoiador não pode ficar preso na máquina. */
export function garantirTemaPermitido(apoiador: boolean) {
  const atual = temaSalvo()
  if (!apoiador && TEMAS_DE_APOIADOR.includes(atual)) aplicarTema('sistema')
}
