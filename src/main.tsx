import React from 'react'
import ReactDOM from 'react-dom/client'
// latin-only subsets, only the weights actually used (Karla 400/600/700,
// Plex Mono 400/600, Anton 400) — keeps the font payload small
import '@fontsource/anton/latin-400.css'
import '@fontsource/karla/latin-400.css'
import '@fontsource/karla/latin-600.css'
import '@fontsource/karla/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
