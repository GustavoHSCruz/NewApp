import { NavLink, Outlet, Link } from 'react-router-dom'
import { Marca } from './Marca'

const classe = ({ isActive }: { isActive: boolean }) => (isActive ? 'ativo' : undefined)

export function Layout() {
  return (
    <div className="app">
      <header className="barra">
        <div className="barra__interno">
          <Link to="/" className="marca">
            <Marca />
            clareia
          </Link>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end className={classe}>Hoje</NavLink>
            <NavLink to="/planos" className={classe}>Planos</NavLink>
            <NavLink to="/ajustes" className={classe}>Ajustes</NavLink>
            <Link to="/novo" className="btn btn--primario btn--p" style={{ marginLeft: '0.4rem' }}>
              Novo plano
            </Link>
          </nav>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
      <footer className="rodape">
        Clareia roda no seu computador. Seus planos ficam aqui, e só aqui.
      </footer>
    </div>
  )
}
