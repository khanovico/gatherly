import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="grid min-h-svh place-items-center text-2xl font-semibold">Gatherly</main>
  </StrictMode>,
);
