import React from 'react'
import ReactDOM from 'react-dom/client'
// latin-only subsets, only the weights actually used (Karla 400/600/700,
// Plex Mono 400/600, Anton 400) — keeps the font payload small
import '@fontsource/oswald/latin-400.css'
import '@fontsource/oswald/latin-600.css'
import '@fontsource/oswald/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
