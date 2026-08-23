import { useState } from 'react'
import { api } from '../api/cliente'
import { precoEmReais, useLicenca } from '../util/licenca'
import { Erro } from '../componentes/Estados'

const GRATUITO = [
  'Planos e passos ilimitados',
  'Agenda do dia e dos próximos sete dias',
  'Adiar, editar, reordenar e concluir',
  'Imprimir e exportar em Markdown',
  'Tema claro e escuro',
  'IA local pelo Ollama, se você tiver',
]

const APOIADOR = [
  ['Mandar o plano para o seu calendário', 'Cada passo vira um evento com lembrete no Google, Apple ou Outlook.'],
  ['Salvar planos como modelo', 'Fez uma mudança? Guarde o plano e recomece dele na próxima.'],
  ['Exportar em HTML com capa', 'Para imprimir ou mandar para outra pessoa com cara de documento.'],
  ['Temas extras', 'Sépia e Carvão, além do claro e do escuro.'],
]

export function Apoiador() {
  const { licenca, apoiador, recarregar } = useLicenca()
  const [chave, setChave] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ativado, setAtivado] = useState(false)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)

  const ativar = async () => {
    setOcupado(true); setErro(null)
    try {
      await api.ativarLicenca(chave.trim())
      await recarregar()
      setChave('')
      setAtivado(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui conferir essa chave.')
    } finally { setOcupado(false) }
  }

  const remover = async () => {
    setOcupado(true)
    try { await api.removerLicenca(); await recarregar(); setConfirmandoRemocao(false) }
    finally { setOcupado(false) }
  }

  if (apoiador) {
    const nome = licenca?.apoiador?.nome
    return (
      <>
        <p className="olho">Apoiador</p>
        <h1 className="frase">{nome ? <>Obrigado, <em>{nome.split(' ')[0]}</em>.</> : <>Obrigado.</>}</h1>
        <p className="sub">
          {ativado ? 'Chave ativada neste computador. ' : ''}
          Os recursos de apoiador estão liberados aqui. Sua chave vale para sempre, sem renovação.
        </p>

        <section className="grupo">
          <div className="grupo__cabeca"><h2>O que você desbloqueou</h2></div>
          <ul className="lista">
            {APOIADOR.map(([titulo, explica]) => (
              <li className="item" key={titulo}>
                <span className="marcar" aria-hidden="true" style={{ background: 'var(--feito)', borderColor: 'var(--feito)', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div className="item__corpo">
                  <p className="item__titulo">{titulo}</p>
                  <p className="item__detalhe">{explica}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grupo">
          <div className="grupo__cabeca"><h2>Sua chave</h2></div>
          <div className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
            <div className="item__meta" style={{ marginBottom: '0.9rem' }}>
              {licenca?.apoiador?.email && <span className="chip">{licenca.apoiador.email}</span>}
              {licenca?.apoiador?.id && <span className="chip">nº {licenca.apoiador.id}</span>}
              <span className="chip chip--feito">ativa</span>
            </div>
            <p className="sub" style={{ maxWidth: 'none', fontSize: '0.9rem' }}>
              A chave fica guardada neste computador. Se for usar o Clareia em outra máquina, é só
              colar a mesma chave lá.
            </p>
            {confirmandoRemocao ? (
              <div className="editor__linha" style={{ marginTop: '0.9rem', alignItems: 'center' }}>
                <span className="sub" style={{ margin: 0 }}>Tirar a chave deste computador?</span>
                <button className="btn btn--perigo btn--p" disabled={ocupado} onClick={() => void remover()}>Tirar</button>
                <button className="btn btn--fantasma btn--p" onClick={() => setConfirmandoRemocao(false)}>Cancelar</button>
              </div>
            ) : (
              <button className="btn btn--fantasma btn--p" style={{ marginTop: '0.9rem' }} onClick={() => setConfirmandoRemocao(true)}>
                Tirar a chave deste computador
              </button>
            )}
          </div>
        </section>
      </>
    )
  }

  const preco = precoEmReais(licenca)
  const url = licenca?.checkout_url

  return (
    <>
      <p className="olho">Apoiador</p>
      <h1 className="frase">O Clareia continua seu, <em>pagando ou não</em>.</h1>
      <p className="sub">
        Nada do que já existe vai virar recurso pago. Quem apoia leva quatro coisas a mais — e
        mantém o projeto de pé.
      </p>

      <div className="planos-preco grupo">
        <section className="cartao coluna-preco">
          <p className="olho" style={{ marginBottom: '0.25rem' }}>Gratuito</p>
          <p className="coluna-preco__valor">para sempre</p>
          <ul className="marcado">
            {GRATUITO.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        <section className="cartao coluna-preco coluna-preco--destaque">
          <p className="olho" style={{ marginBottom: '0.25rem', color: 'var(--acento)' }}>Apoiador</p>
          <p className="coluna-preco__valor">{preco} <small>uma vez só</small></p>
          <ul className="marcado marcado--acento">
            <li>Tudo do gratuito, sempre</li>
            {APOIADOR.map(([titulo, explica]) => (
              <li key={titulo}>
                {titulo}
                <small>{explica}</small>
              </li>
            ))}
          </ul>
          {url ? (
            <a className="btn btn--primario btn--g" href={url} target="_blank" rel="noreferrer noopener">
              Apoiar por {preco}
            </a>
          ) : (
            <>
              <button className="btn btn--g" disabled>Ainda não está à venda</button>
              <p className="sub" style={{ fontSize: '0.86rem', marginTop: '0.6rem' }}>
                Quem publicou este Clareia ainda não abriu as vendas. Nada muda para você: o
                gratuito segue completo.
              </p>
            </>
          )}
        </section>
      </div>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>Já tem uma chave?</h2></div>
        <div className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
          {erro && <div style={{ marginBottom: '0.9rem' }}><Erro mensagem={erro} /></div>}
          <label className="campo" style={{ margin: 0 }}>
            <span>Chave de apoiador</span>
            <small>Cole aqui a chave que você recebeu depois da compra. Ela começa com CLA1.</small>
            <textarea
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="CLA1..."
              style={{ minHeight: '4.5rem', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}
            />
          </label>
          <button className="btn btn--primario" disabled={ocupado || chave.trim().length < 20} onClick={() => void ativar()}>
            {ocupado ? 'Conferindo…' : 'Ativar'}
          </button>
        </div>
      </section>

      <p className="sub" style={{ marginTop: '2.5rem', fontSize: '0.88rem' }}>
        O Clareia é software livre, licença MIT. A conferência da chave é um pedido de apoio, não
        um cadeado — quem quiser passar por cima, passa. Preferimos assim a te vigiar.
        {licenca === null && ' (Não consegui falar com o programa agora, então o estado da sua licença pode não aparecer.)'}
      </p>
    </>
  )
}
