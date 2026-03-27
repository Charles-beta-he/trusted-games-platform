import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const BoardArea = lazy(() => import('./components/board/BoardArea'));
const Footer = lazy(() => import('./components/Footer'));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <BoardArea />
      <Footer />
    </Suspense>
  </React.StrictMode>
);
