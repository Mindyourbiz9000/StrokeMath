import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { SessionProvider } from './state/session';
import { ToastProvider } from './components/Toast';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <SessionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionProvider>
    </I18nProvider>
  </React.StrictMode>,
);
