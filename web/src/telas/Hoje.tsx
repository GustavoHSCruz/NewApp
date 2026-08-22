import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Agenda, ItemAgenda } from '../api/tipos'
import { dataLonga, hojeISO, plural, quando, somarDias } from '../util/datas'
import { Carregando, Erro, Vazio } from '../componentes/Estados'
import { LinhaPasso, type Situacao } from '../componentes/LinhaPasso'

export function Hoje() {
  const [agenda, setAgenda] = useState<Agenda | null>(null)
  const [temPlanos, setTemPlanos] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const hoje = hojeISO()

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const de = hojeISO()
      const [a, planos] = await Promise.all([
        api.agenda(de, somarDias(de, 7)),
        api.listarPlanos({ status: 'todos' }),
      ])
      setAgenda(a)
      setTemPlanos(planos.length > 0)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado por aqui.')
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const agir = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    try { await fn(); await carregar() } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar isso.')
    } finally { setOcupado(false) }
  }

  if (erro && !agenda) return <Erro mensagem={erro} aoTentar={() => void carregar()} />
  if (!agenda) return <Carregando texto="abrindo seu dia…" />

  const atrasados = agenda.atrasados
  const doDia = agenda.periodo.filter((i) => i.data_prevista <= hoje)
  const proximos = agenda.periodo.filter((i) => i.data_prevista > hoje)
  const nAtraso = atrasados.length
  const nHoje = doDia.length
  const nProx = proximos.length

  if (!temPlanos) {
    return (
      <Vazio
        titulo="Ainda não tem nada aqui."
        texto="Comece pelo que está te incomodando. Você descreve com suas palavras e o Clareia devolve os passos, já com datas."
        acao={{ rotulo: 'Criar meu primeiro plano', para: '/novo' }}
      />
    )
  }

  const secao = (titulo: string, itens: ItemAgenda[], situacao: Situacao, atraso = false) =>
    itens.length > 0 && (
      <section className={`grupo${atraso ? ' grupo--atraso' : ''}`}>
        <div className="grupo__cabeca">
          <h2>{titulo}</h2>
          <span className="grupo__conta">{itens.length}</span>
        </div>
        <ul className="lista">
          {itens.map((i, n) => (
            <LinhaPasso
              key={i.id}
              item={i}
              situacao={situacao}
              indice={n}
              ocupado={ocupado}
              aoConcluir={() => void agir(() => api.editarPasso(i.plano_id, i.id, { concluido: true }))}
              aoAdiar={(d) => void agir(() => api.adiarPasso(i.plano_id, i.id, d))}
            />
          ))}
        </ul>
      </section>
    )

  return (
    <>
      {erro && <div style={{ marginBottom: '1rem' }}><Erro mensagem={erro} /></div>}
      <p className="olho">{dataLonga(hoje)}</p>
      <h1 className="frase">
        {nHoje > 0
          ? <>Hoje você tem <em>{plural(nHoje, 'passo', 'passos')}</em>.</>
          : nAtraso + nProx > 0 ? <>Hoje está livre.</> : <>Você está em dia.</>}
        {nAtraso > 0 && <> <span className="atrasada">{plural(nAtraso, 'ficou', 'ficaram')} para trás.</span></>}
      </h1>
      <p className="sub">
        {nHoje > 0 && 'Marque conforme for fazendo. O que não der hoje, você adia.'}
        {nHoje === 0 && nAtraso > 0 && 'Comece pelo que ficou para trás — ou adie, sem drama.'}
        {nHoje === 0 && nAtraso === 0 && nProx > 0 &&
          `O próximo passo é ${quando(proximos[0].data_prevista)}. Nada exige você agora.`}
        {nHoje === 0 && nAtraso === 0 && nProx === 0 && (
          <>Nenhum passo em aberto nos próximos sete dias. <Link to="/planos">Ver seus planos</Link>.</>
        )}
      </p>

      {secao('Ficou para trás', atrasados, 'atrasado', true)}
      {secao('Hoje', doDia, 'hoje')}
      {secao('Próximos sete dias', proximos, 'proximo')}
    </>
  )
}
