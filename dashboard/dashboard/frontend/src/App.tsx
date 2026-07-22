import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LogsPage from './pages/LogsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import SitesPage from './pages/SitesPage'
import CompliancePage from './pages/CompliancePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/compliance" element={<CompliancePage />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
