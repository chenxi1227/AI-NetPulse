import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const { isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen text-text-primary font-body">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col overflow-auto">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="fixed top-3 left-3 z-30 lg:hidden p-2 bg-base-surface/80 border border-base-border rounded-lg"
        >
          <Menu className="w-5 h-5 text-text-primary" />
        </button>
        <Outlet />
      </main>
    </div>
  )
}
