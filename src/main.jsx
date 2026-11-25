import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { APP_MODE, requestPersistentStorage } from './storage.js';

// মোবাইল মোডে: অফলাইন ক্যাশ (service worker) + ডাটা যেন মুছে না যায় সেই অনুরোধ
if (APP_MODE === 'mobile') {
  requestPersistentStorage();
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
