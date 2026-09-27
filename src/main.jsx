import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx'

const path = window.location.pathname;
const isMenuAdmin = path.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMenuAdmin ? <Admin /> : <App />}
  </StrictMode>,
)
