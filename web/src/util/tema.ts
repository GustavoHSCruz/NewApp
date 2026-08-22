export type Tema = 'claro' | 'escuro' | 'sistema'
const CHAVE = 'clareia.tema'

export function temaSalvo(): Tema {
  const t = localStorage.getItem(CHAVE)
  return t === 'claro' || t === 'escuro' ? t : 'sistema'
}

export function aplicarTema(tema: Tema) {
  const escuro = tema === 'escuro' || (tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro'
  if (tema === 'sistema') localStorage.removeItem(CHAVE)
  else localStorage.setItem(CHAVE, tema)
}

export function iniciarTema() {
  aplicarTema(temaSalvo())
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (temaSalvo() === 'sistema') aplicarTema('sistema')
  })
}
