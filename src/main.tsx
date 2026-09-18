import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global runtime error listeners to prevent unhandled rejection crashes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global runtime error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Global unhandled promise rejection:', event.reason);
  });
}

// Handle GitHub Pages / Cloud Run SPA redirection from 404.html
(function() {
  try {
    const l = window.location;
    if (!l) return;
    const p = new URLSearchParams(l.search).get('p');
    if (p) {
      window.history.replaceState(null, '', l.pathname.replace(/\/$/, '') + p + (l.hash || ''));
    }
  } catch (err) {
    console.warn('SPA router redirect init:', err);
  }
})();

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
