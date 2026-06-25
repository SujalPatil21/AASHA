import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker
registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload to update?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('AASHA App is ready to work offline.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

