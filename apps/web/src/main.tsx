import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from '@/app/providers';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <main className="grid min-h-svh place-items-center">
        <h1 className="text-brand text-4xl font-semibold">Gatherly</h1>
      </main>
    </Providers>
  </StrictMode>,
);
