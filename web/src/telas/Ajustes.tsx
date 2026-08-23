import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, BASE, usandoMock } from '../api/cliente'
import type { Saude } from '../api/tipos'
import { aplicarTema, garantirTemaPermitido, temaSalvo, TEMAS_DE_APOIADOR, type Tema } from '../util/tema'
import { precoEmReais, useLicenca } from '../util/licenca'

const TEMAS: { id: Tema; rotulo: string }[] = [
  { id: 'claro', rotulo: 'Claro' },
  { id: 'escuro', rotulo: 'Escuro' },
  { id: 'sistema', rotulo: 'Como o sistema' },
  { id: 'sepia', rotulo: 'Sépia' },
  { id: 'carvao', rotulo: 'Carvão' },
]

export function Ajustes() {
  const { licenca, apoiador } = useLicenca()
  const [tema, setTema] = useState<Tema>(temaSalvo())
  const [saude, setSaude] = useState<Saude | null>(null)
  const [caiu, setCaiu] = useState(false)

  useEffect(() => {
    api.saude().then(setSaude).catch(() => setCaiu(true))
  }, [])

  // Se a chave sair da máquina, um tema de apoiador não pode continuar aplicado.
  useEffect(() => {
    if (licenca) { garantirTemaPermitido(apoiador); setTema(temaSalvo()) }
  }, [licenca, apoiador])

  const trocar = (t: Tema) => { setTema(t); aplicarTema(t) }

  return (
    <>
      <p className="olho">Ajustes</p>
      <h1 className="frase">Do seu jeito.</h1>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>Aparência</h2></div>
        <div className="opcoes">
          {TEMAS.map((t) => {
            const bloqueado = TEMAS_DE_APOIADOR.includes(t.id) && !apoiador
            return bloqueado ? (
              <Link key={t.id} className="opcao opcao--bloqueada" to="/apoiar" title="Faz parte do Clareia Apoiador">
                {t.rotulo}
              </Link>
            ) : (
              <button key={t.id} type="button" className="opcao" aria-pressed={tema === t.id} onClick={() => trocar(t.id)}>
                {t.rotulo}
              </button>
            )
          })}
        </div>
        {!apoiador && (
          <p className="sub" style={{ fontSize: '0.88rem', marginTop: '0.7rem' }}>
            Sépia e Carvão fazem parte do <Link to="/apoiar">Apoiador</Link>.
          </p>
        )}
      </section>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>Sua licença</h2></div>
        <div className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
          {apoiador ? (
            <>
              <div className="item__meta" style={{ marginBottom: '0.8rem' }}>
                <span className="chip chip--feito">apoiador</span>
                {licenca?.apoiador?.nome && <span className="chip">{licenca.apoiador.nome}</span>}
              </div>
              <p className="sub" style={{ maxWidth: 'none' }}>
                Calendário, modelos, HTML com capa e temas extras estão liberados.{' '}
                <Link to="/apoiar">Ver ou tirar a chave</Link>.
              </p>
            </>
          ) : (
            <>
              <div className="item__meta" style={{ marginBottom: '0.8rem' }}>
                <span className="chip">gratuito</span>
              </div>
              <p className="sub" style={{ maxWidth: 'none' }}>
                Você está no Clareia gratuito, que é completo e continua assim. Quem quiser apoiar
                leva calendário, modelos, capa e temas extras por {precoEmReais(licenca)}, uma vez só.{' '}
                <Link to="/apoiar">Conhecer</Link>.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>Onde ficam os seus dados</h2></div>
        <div className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
          <p className="sub" style={{ maxWidth: 'none' }}>
            Tudo que você escreve no Clareia fica gravado em um arquivo no seu próprio computador.
            Nada é enviado para a internet, não existe cadastro e ninguém além de você lê seus planos.
            Para levar um plano para outro lugar, use <strong>Baixar</strong> na tela do plano.
          </p>
          <div className="item__meta" style={{ marginTop: '0.9rem' }}>
            <span className="chip">{usandoMock ? 'modo de demonstração' : `programa em ${BASE}`}</span>
            {saude && <span className="chip chip--feito">funcionando · versão {saude.versao}</span>}
            {caiu && <span className="chip chip--atraso">não está respondendo</span>}
          </div>
        </div>
      </section>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>IA no seu computador</h2></div>
        <div className="cartao" style={{ padding: '1.1rem 1.2rem' }}>
          {saude?.ollama ? (
            <p className="sub" style={{ maxWidth: 'none' }}>
              Encontramos uma IA instalada aqui (Ollama). Ao criar um plano, você pode pedir para ela
              deixar os passos mais parecidos com o seu caso. Ela roda na sua máquina — nada sai daqui,
              e isso é gratuito, com ou sem licença de apoiador.
            </p>
          ) : (
            <p className="sub" style={{ maxWidth: 'none' }}>
              Nenhuma IA local encontrada, e está tudo bem: o Clareia monta os planos sozinho.
              Quem tiver o Ollama instalado ganha passos um pouco mais personalizados, sem pagar nada.
            </p>
          )}
        </div>
      </section>

      <section className="grupo">
        <div className="grupo__cabeca"><h2>Sobre</h2></div>
        <p className="sub">
          Clareia é software livre, licença MIT. Feito para transformar aquilo que está confuso na sua
          cabeça em passos com data — e depois lembrar você do passo certo no dia certo.
        </p>
      </section>
    </>
  )
}
