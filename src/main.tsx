import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import { AppProvider } from '@/store/AppContext'
import AppWorkspace from './App'
import MapDashboardPage from './pages/MapDashboardPage'
import BorewellImportPage from './pages/BorewellImportPage'

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<AppWorkspace />} />
        <Route path="/dashboard" element={<MapDashboardPage />} />
        <Route path="/import"    element={<BorewellImportPage />} />
      </Routes>
    </BrowserRouter>
  </AppProvider>
)
