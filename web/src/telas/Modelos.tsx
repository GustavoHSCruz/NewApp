import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Modelo } from '../api/tipos'
import { hojeISO, somarDias } from '../util/datas'
import { useLicenca } from '../util/licenca'
import { Carregando, Erro, Vazio } from '../componentes/Estados'
import { ConviteApoiador } from '../componentes/ConviteApoiador'

export function Modelos() {
  const { apoiador } = useLicenca()
  const navegar = useNavigate()
  const [modelos, setModelos] = useState<Modelo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [usando, setUsando] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [prazo, setPrazo] = useState(somarDias(hojeISO(), 30))
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!apoiador) return
    setErro(null)
    try { setModelos(await api.listarModelos()) } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui carregar seus modelos.')
    }
  }, [apoiador])

  useEffect(() => { void carregar() }, [carregar])

  if (!apoiador) {
    return (
      <>
        <p className="olho">Modelos</p>
        <h1 className="frase">Guarde um plano e recomece dele.</h1>
        <p className="sub">
          Quem faz a mesma coisa mais de uma vez — mudança, viagem, processo de documento — pode
          salvar um plano pronto como modelo e criar os próximos a partir dele, já com as datas
          redistribuídas.
        </p>
        <ConviteApoiador recurso="Modelos próprios" />
      </>
    )
  }

  const criar = async (modelo: Modelo) => {
    setOcupado(true); setErro(null)
    try {
      const plano = await api.usarModelo(modelo.id, {
        titulo: titulo.trim() || undefined,
        prazo_final: prazo,
      })
      navegar(`/planos/${plano.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui criar o plano.')
      setOcupado(false)
    }
  }

  const excluir = async (id: string) => {
    setOcupado(true)
    try { await api.excluirModelo(id); setConfirmando(null); await carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui apagar o modelo.') }
    finally { setOcupado(false) }
  }

  return (
    <>
      <p className="olho">Modelos</p>
      <h1 className="frase">Seus modelos.</h1>
      <p className="sub">
        Um modelo guarda os passos de um plano, sem as datas. Ao usar, você diz o novo prazo e o
        Clareia redistribui tudo.
      </p>

      {erro && <div className="grupo"><Erro mensagem={erro} aoTentar={() => void carregar()} /></div>}
      {!modelos && !erro && <Carregando />}

      {modelos && modelos.length === 0 && (
        <div className="grupo">
          <Vazio
            titulo="Nenhum modelo salvo ainda."
            texto="Abra um plano que deu certo e use Salvar como modelo. Ele passa a aparecer aqui e no começo de um plano novo."
            acao={{ rotulo: 'Ver meus planos', para: '/planos' }}
          />
        </div>
      )}

      {modelos && modelos.length > 0 && (
        <div className="grade grupo">
          {modelos.map((m) => (
            <article key={m.id} className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{m.nome}</h3>
              <div className="item__meta" style={{ marginBottom: '0.8rem' }}>
                <span className="chip">{m.passos.length} passos</span>
                <span className="chip">{m.categoria}</span>
              </div>

              {usando === m.id ? (
                <div className="editor">
                  <label className="campo" style={{ margin: 0 }}>
                    <span>Nome do novo plano</span>
                    <input type="text" value={titulo} placeholder={m.nome} onChange={(e) => setTitulo(e.target.value)} />
                  </label>
                  <label className="campo" style={{ margin: 0 }}>
                    <span>Para quando</span>
                    <input type="date" value={prazo} min={hojeISO()} onChange={(e) => setPrazo(e.target.value)} />
                  </label>
                  <div className="editor__linha">
                    <button className="btn btn--primario" disabled={ocupado} onClick={() => void criar(m)}>
                      {ocupado ? 'Criando…' : 'Criar plano'}
                    </button>
                    <button className="btn btn--fantasma" onClick={() => setUsando(null)}>Cancelar</button>
                  </div>
                </div>
              ) : confirmando === m.id ? (
                <div className="editor__linha" style={{ alignItems: 'center' }}>
                  <span className="sub" style={{ margin: 0, fontSize: '0.9rem' }}>Apagar este modelo?</span>
                  <button className="btn btn--perigo btn--p" disabled={ocupado} onClick={() => void excluir(m.id)}>Apagar</button>
                  <button className="btn btn--fantasma btn--p" onClick={() => setConfirmando(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="editor__linha">
                  <button className="btn" onClick={() => { setUsando(m.id); setTitulo(''); setPrazo(somarDias(hojeISO(), 30)) }}>
                    Criar plano a partir daqui
                  </button>
                  <button className="btn btn--fantasma btn--p" onClick={() => setConfirmando(m.id)}>Apagar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="sub" style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
        Para criar um modelo, <Link to="/planos">abra um plano</Link> e use <strong>Salvar como modelo</strong>.
      </p>
    </>
  )
}
