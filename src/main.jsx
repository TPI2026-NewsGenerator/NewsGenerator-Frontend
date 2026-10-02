//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: main.jsx
//  Description: frontend routing
//

import { createRoot } from 'react-dom/client'
import {BrowserRouter} from "react-router-dom";
import './styles/index.css'
import App from './App.jsx'
import {AuthProvider} from './features/auth/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
