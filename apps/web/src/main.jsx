import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { setupPwa } from './lib/pwa';
import { applyTheme, useUi } from './lib/uiStore';
import './index.css';

// Before the first render, so the page never flashes the wrong theme.
applyTheme(useUi.getState().theme);
setupPwa();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
