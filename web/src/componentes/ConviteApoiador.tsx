import { Link } from 'react-router-dom'
import { precoEmReais, useLicenca } from '../util/licenca'

/** Aparece no lugar de um recurso pago. Explica e sai da frente — nunca bloqueia
 *  o caminho de quem só quer usar o Clareia gratuito. */
export function ConviteApoiador({ recurso }: { recurso: string }) {
  const { licenca } = useLicenca()
  return (
    <div className="cartao convite">
      <div>
        <p className="convite__olho">Clareia Apoiador</p>
        <p className="convite__texto">
          <strong>{recurso}</strong> faz parte do Apoiador — {precoEmReais(licenca)}, uma vez só.
          O resto do Clareia continua gratuito e completo, com ou sem isso.
        </p>
      </div>
      <Link className="btn btn--primario" to="/apoiar">Ver o que vem junto</Link>
    </div>
  )
}
