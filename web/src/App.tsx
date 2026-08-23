import { Route, Routes } from 'react-router-dom'
import { Layout } from './componentes/Layout'
import { Hoje } from './telas/Hoje'
import { Novo } from './telas/Novo'
import { Planos } from './telas/Planos'
import { Plano } from './telas/Plano'
import { Ajustes } from './telas/Ajustes'
import { Apoiador } from './telas/Apoiador'
import { Modelos } from './telas/Modelos'
import { Vazio } from './componentes/Estados'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Hoje />} />
        <Route path="novo" element={<Novo />} />
        <Route path="planos" element={<Planos />} />
        <Route path="planos/:id" element={<Plano />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="apoiar" element={<Apoiador />} />
        <Route path="modelos" element={<Modelos />} />
        <Route
          path="*"
          element={<Vazio titulo="Essa página não existe." texto="Talvez o plano tenha sido apagado." acao={{ rotulo: 'Voltar para hoje', para: '/' }} />}
        />
      </Route>
    </Routes>
  )
}
