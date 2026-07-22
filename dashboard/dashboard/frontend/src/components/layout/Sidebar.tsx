import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Settings, Shield, LogOut, Globe, BarChart3, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logs', icon: FileText, label: 'Audit Logs' },
  { to: '/compliance', icon: BarChart3, label: 'Compliance' },
  { to: '/sites', icon: Globe, label: 'Site Registry' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { username, logout } = useAuth()
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-base-surface/90 border-r border-base-border/50 flex flex-col h-screen flex-shrink-0
        transition-transform duration-200 ease-out
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-5 border-b border-base-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-display text-xl font-bold text-text-primary">AI NetPulse</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-body text-sm ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-base-border hover:text-text-primary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-base-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-text-muted font-body">{username}</span>
            <button onClick={logout} className="text-text-muted hover:text-danger transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
