import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Pergunta, Preparo } from '../api/tipos'
import { hojeISO, somarDias } from '../util/datas'
import { Erro } from '../componentes/Estados'

const EXEMPLOS = [
  'Organizar a mudança de apartamento',
  'Me preparar para uma entrevista de emprego',
  'Regularizar meus documentos',
  'Planejar uma viagem de duas semanas',
]

const PRAZOS = [
  { rotulo: 'Uma semana', dias: 7 },
  { rotulo: 'Um mês', dias: 30 },
  { rotulo: 'Três meses', dias: 90 },
]

export function Novo() {
  const navegar = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState(somarDias(hojeISO(), 30))
  const [preparo, setPreparo] = useState<Preparo | null>(null)
  const [titulo, setTitulo] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [ollamaDisponivel, setOllamaDisponivel] = useState(false)
  const [usarOllama, setUsarOllama] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.saude().then((s) => setOllamaDisponivel(s.ollama)).catch(() => setOllamaDisponivel(false))
  }, [])

  const preparar = async () => {
    setOcupado(true); setErro(null)
    try {
      const p = await api.prepararPlano({ descricao: descricao.trim(), prazo_final: prazo })
      setPreparo(p)
      setTitulo(p.titulo_sugerido)
      setEtapa(3)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui entender essa descrição.')
    } finally { setOcupado(false) }
  }

  const criar = async () => {
    setOcupado(true); setErro(null)
    try {
      const plano = await api.criarPlano({
        descricao: descricao.trim(),
        prazo_final: prazo,
        categoria: preparo?.categoria,
        titulo: titulo.trim() || undefined,
        respostas,
        usar_ollama: usarOllama,
      })
      navegar(`/planos/${plano.id}`, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui montar o plano.')
      setOcupado(false)
    }
  }

  const responder = (id: string, valor: string) => setRespostas((r) => ({ ...r, [id]: valor }))

  return (
    <div className="assistente">
      <div className="passos-topo" aria-hidden="true">
        {[1, 2, 3].map((n) => <span key={n} className={etapa >= n ? 'feito' : undefined} />)}
      </div>

      {erro && <div style={{ marginBottom: '1.25rem' }}><Erro mensagem={erro} /></div>}

      {etapa === 1 && (
        <>
          <p className="olho">Passo 1 de 3</p>
          <h1 className="frase">O que você precisa resolver?</h1>
          <p className="sub">Escreva do seu jeito, como você contaria para alguém. Não precisa organizar nada — essa é a parte que o Clareia faz.</p>
          <label className="campo" style={{ marginTop: '1.75rem' }}>
            <span>Sua situação</span>
            <textarea
              value={descricao}
              autoFocus
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: preciso organizar a mudança para o apartamento novo, tenho muita coisa e nunca fiz isso sozinho"
            />
          </label>
          <div className="exemplos">
            {EXEMPLOS.map((e) => (
              <button key={e} type="button" className="opcao" onClick={() => setDescricao(e)}>{e}</button>
            ))}
          </div>
          <div className="acoes-assistente">
            <button className="btn btn--primario btn--g" disabled={descricao.trim().length < 5} onClick={() => setEtapa(2)}>
              Continuar
            </button>
          </div>
        </>
      )}

      {etapa === 2 && (
        <>
          <p className="olho">Passo 2 de 3</p>
          <h1 className="frase">Para quando precisa estar resolvido?</h1>
          <p className="sub">É a partir dessa data que o Clareia calcula os prazos de cada passo, de trás para frente.</p>
          <div className="exemplos" style={{ marginTop: '1.75rem', marginBottom: '1rem' }}>
            {PRAZOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                className="opcao"
                aria-pressed={prazo === somarDias(hojeISO(), p.dias)}
                onClick={() => setPrazo(somarDias(hojeISO(), p.dias))}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <label className="campo">
            <span>Ou escolha a data</span>
            <input type="date" value={prazo} min={hojeISO()} onChange={(e) => setPrazo(e.target.value)} />
          </label>
          <div className="acoes-assistente">
            <button className="btn btn--fantasma" onClick={() => setEtapa(1)}>Voltar</button>
            <button className="btn btn--primario btn--g" disabled={ocupado || !prazo} onClick={() => void preparar()}>
              {ocupado ? 'Pensando…' : 'Continuar'}
            </button>
          </div>
        </>
      )}

      {etapa === 3 && preparo && (
        <>
          <p className="olho">Passo 3 de 3</p>
          <h1 className="frase">Só mais {preparo.perguntas.length === 1 ? 'uma coisa' : 'duas coisas'}.</h1>
          <p className="sub">Isso afina os passos para o seu caso. Pode pular o que não souber.</p>

          <label className="campo" style={{ marginTop: '1.75rem' }}>
            <span>Nome do plano</span>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>

          {preparo.perguntas.map((p: Pergunta) => (
            <div className="campo" key={p.id}>
              <span id={`rot-${p.id}`}>{p.rotulo}</span>
              {p.tipo === 'escolha' && (
                <div className="opcoes" role="group" aria-labelledby={`rot-${p.id}`}>
                  {(p.opcoes ?? []).map((o) => (
                    <button key={o} type="button" className="opcao"
                      aria-pressed={respostas[p.id] === o} onClick={() => responder(p.id, o)}>{o}</button>
                  ))}
                </div>
              )}
              {p.tipo === 'sim_nao' && (
                <div className="opcoes" role="group" aria-labelledby={`rot-${p.id}`}>
                  {['Sim', 'Não'].map((o) => (
                    <button key={o} type="button" className="opcao"
                      aria-pressed={respostas[p.id] === o} onClick={() => responder(p.id, o)}>{o}</button>
                  ))}
                </div>
              )}
              {p.tipo === 'texto' && (
                <input type="text" aria-labelledby={`rot-${p.id}`} value={respostas[p.id] ?? ''}
                  onChange={(e) => responder(p.id, e.target.value)} />
              )}
              {p.tipo === 'numero' && (
                <input type="number" aria-labelledby={`rot-${p.id}`} value={respostas[p.id] ?? ''}
                  onChange={(e) => responder(p.id, e.target.value)} />
              )}
              {p.tipo === 'data' && (
                <input type="date" aria-labelledby={`rot-${p.id}`} value={respostas[p.id] ?? ''}
                  onChange={(e) => responder(p.id, e.target.value)} />
              )}
            </div>
          ))}

          {ollamaDisponivel && (
            <div className="cartao" style={{ padding: '0.9rem 1rem', marginBottom: '1.1rem' }}>
              <button type="button" className="opcao" aria-pressed={usarOllama} onClick={() => setUsarOllama(!usarOllama)}>
                {usarOllama ? 'Vai usar a IA do seu computador' : 'Usar a IA que já está no seu computador'}
              </button>
              <p className="sub" style={{ fontSize: '0.86rem', marginTop: '0.6rem' }}>
                Deixa os passos mais parecidos com o seu caso. Demora alguns segundos a mais e nada sai da sua máquina.
              </p>
            </div>
          )}

          <div className="acoes-assistente">
            <button className="btn btn--fantasma" onClick={() => setEtapa(2)}>Voltar</button>
            <button className="btn btn--primario btn--g" disabled={ocupado} onClick={() => void criar()}>
              {ocupado ? 'Montando seu plano…' : 'Criar plano'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
