import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente'
import type { ResumoPlano, StatusFiltro } from '../api/tipos'
import { dataCurta, quando } from '../util/datas'
import { Carregando, Erro, Vazio } from '../componentes/Estados'
import { Progresso } from '../componentes/Progresso'

const FILTROS: { id: StatusFiltro; rotulo: string }[] = [
  { id: 'ativos', rotulo: 'Em andamento' },
  { id: 'concluidos', rotulo: 'Concluídos' },
  { id: 'todos', rotulo: 'Todos' },
]

export function Planos() {
  const [planos, setPlanos] = useState<ResumoPlano[] | null>(null)
  const [status, setStatus] = useState<StatusFiltro>('ativos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      setPlanos(await api.listarPlanos({ status, q: busca.trim() || undefined }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui carregar seus planos.')
    }
  }, [status, busca])

  useEffect(() => {
    const t = setTimeout(() => void carregar(), busca ? 250 : 0)
    return () => clearTimeout(t)
  }, [carregar, busca])

  return (
    <>
      <p className="olho">Seus planos</p>
      <h1 className="frase">Tudo o que você está tocando.</h1>

      <div className="linha-acoes" style={{ marginBottom: '0.5rem', alignItems: 'center' }}>
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className="opcao" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
            {f.rotulo}
          </button>
        ))}
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar planos por nome"
          style={{ maxWidth: '15rem', marginLeft: 'auto' }}
        />
      </div>

      {erro && <Erro mensagem={erro} aoTentar={() => void carregar()} />}
      {!planos && !erro && <Carregando />}

      {planos && planos.length === 0 && (
        <div className="grupo">
          <Vazio
            titulo={busca ? 'Nada com esse nome.' : status === 'concluidos' ? 'Nenhum plano concluído ainda.' : 'Nenhum plano por aqui.'}
            texto={busca ? 'Tente outra palavra, ou limpe a busca.' : 'Quando você criar um plano, ele aparece nesta lista com o progresso.'}
            acao={busca ? undefined : { rotulo: 'Criar um plano', para: '/novo' }}
          />
        </div>
      )}

      {planos && planos.length > 0 && (
        <div className="grade grupo">
          {planos.map((p) => (
            <Link key={p.id} to={`/planos/${p.id}`} className="cartao cartao-plano">
              <h3>{p.titulo}</h3>
              <div className="item__meta">
                <span className="chip">até {dataCurta(p.prazo_final)}</span>
                {p.concluidos === p.total && p.total > 0
                  ? <span className="chip chip--feito">concluído</span>
                  : p.proximo_passo && <span className="chip">próximo {quando(p.proximo_passo.data_prevista)}</span>}
              </div>
              <Progresso feitos={p.concluidos} total={p.total} />
              {p.proximo_passo && p.concluidos !== p.total && (
                <p className="item__detalhe" style={{ marginTop: '0.7rem' }}>{p.proximo_passo.titulo}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
