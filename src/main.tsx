import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AppProvider } from '@/store/AppContext';
import AppWorkspace from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkeletonLoader } from '@/components/SkeletonLoader';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes cache validity
    },
  },
});

// Lazy load route pages to enable code splitting
const MapDashboardPage = lazy(() => import('./pages/MapDashboardPage'));
const BorewellImportPage = lazy(() => import('./pages/BorewellImportPage'));

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<SkeletonLoader />}>
          <Routes>
            <Route path="/"          element={<AppWorkspace />} />
            <Route path="/dashboard" element={<ErrorBoundary><MapDashboardPage /></ErrorBoundary>} />
            <Route path="/import"    element={<BorewellImportPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  </QueryClientProvider>
);
