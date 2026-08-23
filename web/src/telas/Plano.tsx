import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Passo, Plano as TPlano } from '../api/tipos'
import { dataCurta, dataLonga, hojeISO, quando } from '../util/datas'
import { Carregando, Erro } from '../componentes/Estados'
import { useLicenca } from '../util/licenca'
import { Progresso } from '../componentes/Progresso'
import { Marcar } from '../componentes/Marcar'

export function Plano() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { apoiador } = useLicenca()
  const [plano, setPlano] = useState<TPlano | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editandoPlano, setEditandoPlano] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [novoPasso, setNovoPasso] = useState('')
  const [salvandoModelo, setSalvandoModelo] = useState(false)
  const [nomeModelo, setNomeModelo] = useState('')
  const [modeloSalvo, setModeloSalvo] = useState(false)
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    setErro(null)
    try { setPlano(await api.obterPlano(id)) } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não encontrei esse plano.')
    }
  }, [id])

  useEffect(() => { void carregar() }, [carregar])

  const agir = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    try { await fn(); await carregar() } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar isso.')
    } finally { setOcupado(false) }
  }

  if (erro && !plano) return <Erro mensagem={erro} aoTentar={() => void carregar()} />
  if (!plano) return <Carregando texto="abrindo o plano…" />

  const passos = [...plano.passos].sort((a, b) => a.ordem - b.ordem)
  const pendentesFuturos = passos.findIndex((p) => !p.concluido_em && p.data_prevista >= hoje)
  // Onde a linha do "hoje" corta a trilha: antes do primeiro passo que ainda não venceu.
  // Se tudo já venceu, a marca fica no fim — é a leitura correta: o dia passou por cima do plano.
  const indiceHoje = pendentesFuturos === -1 ? passos.length : pendentesFuturos
  const concluido = plano.total > 0 && plano.concluidos === plano.total

  const mover = (p: Passo, delta: number) => {
    const ids = passos.map((x) => x.id)
    const i = ids.indexOf(p.id)
    const j = i + delta
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    void agir(() => api.reordenar(plano.id, ids))
  }

  return (
    <>
      {erro && <div style={{ marginBottom: '1rem' }}><Erro mensagem={erro} /></div>}

      <p className="olho">
        <Link to="/planos" style={{ color: 'inherit' }}>Planos</Link> · prazo {dataLonga(plano.prazo_final)}
      </p>

      <div className="plano-topo">
        <div style={{ flex: '1 1 20rem', minWidth: 0 }}>
          <h1>{plano.titulo}</h1>
          {plano.descricao && <p className="sub" style={{ marginTop: '0.5rem' }}>{plano.descricao}</p>}
        </div>
        <div className="plano-topo__acoes">
          <button className="btn btn--p" onClick={() => setEditandoPlano(!editandoPlano)}>
            {editandoPlano ? 'Fechar' : 'Editar plano'}
          </button>
          {apoiador && (
            <button className="btn btn--p" onClick={() => { setSalvandoModelo(true); setNomeModelo(plano.titulo); setModeloSalvo(false) }}>
              Salvar como modelo
            </button>
          )}
          <button className="btn btn--p" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>

      {salvandoModelo && (
        <div className="cartao" style={{ padding: '1.1rem 1.2rem', marginBottom: '1.5rem' }}>
          {modeloSalvo ? (
            <div className="editor__linha" style={{ alignItems: 'center' }}>
              <p className="sub" style={{ margin: 0 }}>
                Modelo guardado. Ele aparece agora em <Link to="/modelos">Modelos</Link> e no começo de um plano novo.
              </p>
              <button className="btn btn--fantasma btn--p" style={{ marginLeft: 'auto' }} onClick={() => setSalvandoModelo(false)}>Fechar</button>
            </div>
          ) : (
            <div className="editor">
              <label className="campo" style={{ margin: 0 }}>
                <span>Nome do modelo</span>
                <small>Guarda os passos deste plano, sem as datas. Você escolhe o prazo a cada vez que usar.</small>
                <input type="text" value={nomeModelo} onChange={(e) => setNomeModelo(e.target.value)} />
              </label>
              <div className="editor__linha">
                <button
                  className="btn btn--primario"
                  disabled={ocupado || !nomeModelo.trim()}
                  onClick={() => {
                    setOcupado(true)
                    api.salvarModelo(plano.id, nomeModelo.trim())
                      .then(() => setModeloSalvo(true))
                      .catch((e) => setErro(e instanceof Error ? e.message : 'Não consegui salvar o modelo.'))
                      .finally(() => setOcupado(false))
                  }}
                >
                  Salvar modelo
                </button>
                <button className="btn btn--fantasma" onClick={() => setSalvandoModelo(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editandoPlano && (
        <div className="cartao" style={{ padding: '1.1rem 1.2rem', marginBottom: '1.5rem' }}>
          <FormularioPlano
            plano={plano}
            ocupado={ocupado}
            aoSalvar={(d) => { void agir(() => api.atualizarPlano(plano.id, d)); setEditandoPlano(false) }}
          />
          <hr style={{ border: 0, borderTop: '1px solid var(--linha)', margin: '1.1rem 0' }} />
          {confirmandoExclusao ? (
            <div className="editor__linha" style={{ alignItems: 'center' }}>
              <span className="sub" style={{ margin: 0 }}>Apagar este plano e todos os passos?</span>
              <button className="btn btn--perigo btn--p" disabled={ocupado}
                onClick={() => void api.excluirPlano(plano.id).then(() => navegar('/planos', { replace: true }))}>
                Apagar mesmo
              </button>
              <button className="btn btn--fantasma btn--p" onClick={() => setConfirmandoExclusao(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="btn btn--perigo btn--p" onClick={() => setConfirmandoExclusao(true)}>Apagar plano</button>
          )}
        </div>
      )}

      <div style={{ maxWidth: '28rem', marginBottom: '1.25rem' }}>
        <Progresso feitos={plano.concluidos} total={plano.total} />
      </div>

      <div className="exportar">
        <span className="exportar__rotulo">Levar este plano</span>
        <a className="exportar__link" href={api.urlExportacao(plano.id, 'markdown')} download>Markdown</a>
        {apoiador ? (
          <>
            <a className="exportar__link" href={api.urlExportacao(plano.id, 'ics')} download>Calendário (.ics)</a>
            <a className="exportar__link" href={api.urlExportacao(plano.id, 'html', true)} download>HTML com capa</a>
          </>
        ) : (
          <Link className="exportar__link exportar__link--apoiador" to="/apoiar">
            Calendário e HTML com capa · Apoiador
          </Link>
        )}
      </div>

      {concluido && (
        <div className="aviso aviso--calmo" style={{ marginBottom: '1.5rem' }}>
          <span aria-hidden="true">✓</span>
          <p style={{ margin: 0 }}>Você terminou este plano. Nada mais vai aparecer na sua agenda por causa dele.</p>
        </div>
      )}

      <ol className="trilha">
        {passos.map((p, i) => (
          <li key={p.id}>
            {i === indiceHoje && <div className="hoje-marca"><span>hoje</span></div>}
            <div className={[
              'trilha__no',
              p.concluido_em ? 'trilha__no--feito' : '',
              !p.concluido_em && p.data_prevista < hoje ? 'trilha__no--atrasado' : '',
              p.ancora ? 'trilha__no--rigida' : '',
            ].filter(Boolean).join(' ')}>
              <span className="trilha__marca" aria-hidden="true" />
              {editando === p.id ? (
                <div className="cartao" style={{ padding: '1rem' }}>
                  <FormularioPasso
                    passo={p}
                    ocupado={ocupado}
                    aoSalvar={(d) => { void agir(() => api.editarPasso(plano.id, p.id, d)); setEditando(null) }}
                    aoCancelar={() => setEditando(null)}
                    aoExcluir={() => { void agir(() => api.excluirPasso(plano.id, p.id)); setEditando(null) }}
                  />
                </div>
              ) : (
                <div className={`item ${p.concluido_em ? 'item--feito' : ''}`} style={{ animation: 'none' }}>
                  <Marcar
                    feito={!!p.concluido_em}
                    rotulo={p.titulo}
                    aoAlternar={() => void agir(() => api.editarPasso(plano.id, p.id, { concluido: !p.concluido_em }))}
                  />
                  <div className="item__corpo">
                    <p className="item__titulo">{p.titulo}</p>
                    <div className="item__meta">
                      <span className={`chip ${p.concluido_em ? 'chip--feito' : p.data_prevista < hoje ? 'chip--atraso' : p.data_prevista === hoje ? 'chip--hoje' : ''}`}>
                        {p.concluido_em ? `feito em ${dataCurta(p.concluido_em.slice(0, 10))}` : quando(p.data_prevista)}
                      </span>
                      {p.ancora && <span className="chip chip--rigida">data fixa</span>}
                    </div>
                    {p.detalhe && <p className="item__detalhe">{p.detalhe}</p>}
                  </div>
                  <div className="item__acoes">
                    <button className="btn btn--fantasma btn--p" onClick={() => mover(p, -1)} disabled={ocupado || i === 0} aria-label="Mover para cima">↑</button>
                    <button className="btn btn--fantasma btn--p" onClick={() => mover(p, 1)} disabled={ocupado || i === passos.length - 1} aria-label="Mover para baixo">↓</button>
                    {!p.ancora && !p.concluido_em && (
                      <button className="btn btn--fantasma btn--p" disabled={ocupado}
                        onClick={() => void agir(() => api.adiarPasso(plano.id, p.id, 1))}>Adiar</button>
                    )}
                    <button className="btn btn--fantasma btn--p" onClick={() => setEditando(p.id)}>Editar</button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
        {indiceHoje === passos.length && passos.length > 0 && (
          <li><div className="hoje-marca"><span>hoje</span></div></li>
        )}
      </ol>

      <form
        className="linha-acoes"
        onSubmit={(e) => {
          e.preventDefault()
          if (!novoPasso.trim()) return
          void agir(() => api.criarPasso(plano.id, { titulo: novoPasso.trim() }))
          setNovoPasso('')
        }}
      >
        <input
          type="text"
          value={novoPasso}
          onChange={(e) => setNovoPasso(e.target.value)}
          placeholder="Faltou algum passo? Escreva aqui"
          aria-label="Novo passo"
          style={{ flex: '1 1 18rem' }}
        />
        <button className="btn" type="submit" disabled={ocupado || !novoPasso.trim()}>Adicionar passo</button>
      </form>
    </>
  )
}

function FormularioPlano({
  plano, ocupado, aoSalvar,
}: {
  plano: TPlano
  ocupado: boolean
  aoSalvar: (d: { titulo: string; descricao: string; prazo_final: string }) => void
}) {
  const [titulo, setTitulo] = useState(plano.titulo)
  const [descricao, setDescricao] = useState(plano.descricao)
  const [prazo, setPrazo] = useState(plano.prazo_final)
  return (
    <div className="editor">
      <label className="campo" style={{ margin: 0 }}>
        <span>Nome</span>
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="campo" style={{ margin: 0 }}>
        <span>Situação</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ minHeight: '4.5rem' }} />
      </label>
      <label className="campo" style={{ margin: 0 }}>
        <span>Prazo final</span>
        <small>Mudar o prazo redistribui os passos que ainda não têm data fixa.</small>
        <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
      </label>
      <div className="editor__linha">
        <button className="btn btn--primario" disabled={ocupado || !titulo.trim()}
          onClick={() => aoSalvar({ titulo: titulo.trim(), descricao, prazo_final: prazo })}>
          Salvar
        </button>
      </div>
    </div>
  )
}

function FormularioPasso({
  passo, ocupado, aoSalvar, aoCancelar, aoExcluir,
}: {
  passo: Passo
  ocupado: boolean
  aoSalvar: (d: { titulo: string; detalhe: string; data_prevista: string }) => void
  aoCancelar: () => void
  aoExcluir: () => void
}) {
  const [titulo, setTitulo] = useState(passo.titulo)
  const [detalhe, setDetalhe] = useState(passo.detalhe)
  const [data, setData] = useState(passo.data_prevista)
  return (
    <div className="editor">
      <label className="campo" style={{ margin: 0 }}>
        <span>O que precisa ser feito</span>
        <input type="text" value={titulo} autoFocus onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="campo" style={{ margin: 0 }}>
        <span>Detalhe (opcional)</span>
        <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} style={{ minHeight: '4rem' }} />
      </label>
      <label className="campo" style={{ margin: 0 }}>
        <span>Data</span>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <div className="editor__linha">
        <button className="btn btn--primario" disabled={ocupado || !titulo.trim()}
          onClick={() => aoSalvar({ titulo: titulo.trim(), detalhe, data_prevista: data })}>Salvar</button>
        <button className="btn btn--fantasma" onClick={aoCancelar}>Cancelar</button>
        <button className="btn btn--perigo btn--p" style={{ marginLeft: 'auto' }} onClick={aoExcluir}>Apagar passo</button>
      </div>
    </div>
  )
}
