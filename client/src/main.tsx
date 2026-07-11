import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, 
      gcTime: 10 * 60 * 1000, 
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, forcing reload to update.');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)
