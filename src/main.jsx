import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthSaglayici } from './context/AuthContext.jsx'
import { TemaSaglayici } from './context/TemaContext.jsx'
import { BildirimSaglayici } from './context/BildirimContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TemaSaglayici>
        <AuthSaglayici>
          <BildirimSaglayici>
            <App />
          </BildirimSaglayici>
        </AuthSaglayici>
      </TemaSaglayici>
    </BrowserRouter>
  </React.StrictMode>,
)
