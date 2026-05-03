import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Adicione a importação:
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* Envolva o App com o HelmetProvider */}
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)