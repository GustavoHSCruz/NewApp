import { Link } from 'react-router-dom'

export function Carregando({ texto = 'carregando…' }: { texto?: string }) {
  return <p className="carregando" role="status">{texto}</p>
}

export function Erro({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className="aviso" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <p style={{ margin: 0 }}>{mensagem}</p>
        {aoTentar && (
          <button className="btn btn--p" style={{ marginTop: '0.6rem' }} onClick={aoTentar}>
            Tentar de novo
          </button>
        )}
      </div>
    </div>
  )
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: { rotulo: string; para: string } }) {
  return (
    <div className="vazio">
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {acao && <Link className="btn btn--primario btn--g" to={acao.para}>{acao.rotulo}</Link>}
    </div>
  )
}
