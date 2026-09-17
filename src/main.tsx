import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle GitHub Pages SPA redirection from 404.html
(function() {
  const l = window.location;
  const p = new URLSearchParams(l.search).get('p');
  if (p) {
    window.history.replaceState(null, '', l.pathname.replace(/\/$/, '') + p + (l.hash || ''));
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
