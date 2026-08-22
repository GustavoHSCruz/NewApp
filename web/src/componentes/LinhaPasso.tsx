import { Link } from 'react-router-dom'
import type { ItemAgenda } from '../api/tipos'
import { quando } from '../util/datas'
import { Marcar } from './Marcar'

export type Situacao = 'atrasado' | 'hoje' | 'proximo'

export function LinhaPasso({
  item, situacao, aoConcluir, aoAdiar, indice, ocupado,
}: {
  item: ItemAgenda
  situacao: Situacao
  aoConcluir: () => void
  aoAdiar: (dias: number) => void
  indice: number
  ocupado: boolean
}) {
  return (
    <li className={`item item--${situacao}`} style={{ animationDelay: `${Math.min(indice, 8) * 35}ms` }}>
      <Marcar feito={!!item.concluido_em} aoAlternar={aoConcluir} rotulo={item.titulo} />
      <div className="item__corpo">
        <p className="item__titulo">{item.titulo}</p>
        <div className="item__meta">
          <span className={`chip ${situacao === 'atrasado' ? 'chip--atraso' : situacao === 'hoje' ? 'chip--hoje' : ''}`}>
            {quando(item.data_prevista)}
          </span>
          <Link className="item__plano" to={`/planos/${item.plano_id}`}>{item.plano_titulo}</Link>
          {item.ancora && <span className="chip chip--rigida" title="Data presa a um compromisso real">data fixa</span>}
        </div>
        {item.detalhe && <p className="item__detalhe">{item.detalhe}</p>}
      </div>
      <div className="item__acoes">
        {!item.ancora && (
          <button className="btn btn--fantasma btn--p" disabled={ocupado} onClick={() => aoAdiar(1)}>
            Adiar 1 dia
          </button>
        )}
      </div>
    </li>
  )
}
