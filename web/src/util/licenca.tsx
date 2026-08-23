import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/cliente'
import type { Licenca } from '../api/tipos'

interface Contexto {
  licenca: Licenca | null
  apoiador: boolean
  recarregar: () => Promise<void>
}

const ContextoLicenca = createContext<Contexto>({ licenca: null, apoiador: false, recarregar: async () => {} })

export function ProvedorLicenca({ children }: { children: ReactNode }) {
  const [licenca, setLicenca] = useState<Licenca | null>(null)

  const recarregar = useCallback(async () => {
    try { setLicenca(await api.licenca()) } catch { setLicenca(null) }
  }, [])

  useEffect(() => { void recarregar() }, [recarregar])

  return (
    <ContextoLicenca value={{ licenca, apoiador: !!licenca?.ativa, recarregar }}>
      {children}
    </ContextoLicenca>
  )
}

export const useLicenca = () => use(ContextoLicenca)

export function precoEmReais(l: Licenca | null) {
  if (!l) return 'R$ 39'
  return l.preco.moeda === 'BRL' ? `R$ ${l.preco.valor}` : `${l.preco.valor} ${l.preco.moeda}`
}
