// In plain terms: this is the very first file that runs. It finds the empty
// <div id="root"> in index.html and tells React to draw the whole app (<App />) inside it.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
