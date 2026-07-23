import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/tokens.css'
import './styles/ea-theme.css'
import './styles.css'
import './ai-studio.css'

const isTauri = Boolean(
  typeof window !== 'undefined' &&
    (window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_METADATA__)
)

document.documentElement.setAttribute('data-platform', isTauri ? 'desktop' : 'web')

const savedTheme = localStorage.getItem('evolveagent-theme')
if (savedTheme === 'light' || savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
