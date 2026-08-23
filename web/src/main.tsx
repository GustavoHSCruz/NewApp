import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { iniciarTema } from './util/tema'
import { ProvedorLicenca } from './util/licenca'
import './estilos/app.css'

iniciarTema()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorLicenca>
        <App />
      </ProvedorLicenca>
    </BrowserRouter>
  </StrictMode>,
)
