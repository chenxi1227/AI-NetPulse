import { useEffect, useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Dropdown from '../components/ui/Dropdown'
import StatusBadge from '../components/ui/StatusBadge'
import { api } from '../services/api'
import type { UserResponse } from '../types'

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [department, setDepartment] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null)

  const fetchUsers = () => api.listUsers().then(setUsers).catch(console.error)
  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createUser({ username, password, role, department, is_active: isActive })
      setUsername(''); setPassword(''); setRole('user'); setDepartment(''); setIsActive(true); setShowForm(false)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      await api.updateUser(id, { is_active: !active })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !active } : u))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle active status')
    }
  }

  const creating = showForm && (
    <Modal open onClose={() => setShowForm(false)} title="Add User" maxWidth="480px">
      <form onSubmit={handleCreate} className="p-6 space-y-4">
        <div>
          <label className="block text-xs text-text-muted font-body mb-1">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent" required />
        </div>
        <div>
          <label className="block text-xs text-text-muted font-body mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent" required />
        </div>
        <div>
          <label className="block text-xs text-text-muted font-body mb-1">Role</label>
          <Dropdown value={role} onChange={v => setRole(v as string)} options={[
            { value: 'user', label: 'user' },
            { value: 'admin', label: 'admin' },
          ]} />
        </div>
        <div>
          <label className="block text-xs text-text-muted font-body mb-1">Department</label>
          <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. IT"
            className="w-full bg-base-border rounded-lg px-4 py-2.5 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-xs text-text-muted font-body mb-1">Active</label>
          <button type="button" onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-body ${
              isActive ? 'border-success/40 text-success bg-success/10' : 'border-base-border text-text-muted'
            }`}>
            {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isActive ? 'Active' : 'Disabled'}
          </button>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setShowForm(false)}
            className="px-4 py-2 bg-base-border hover:bg-base-border/80 text-text-muted rounded-lg transition-colors text-sm font-body">Cancel</button>
          <button type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-black rounded-lg transition-colors text-sm font-body">Create</button>
        </div>
      </form>
    </Modal>
  )

  return (
    <>
      <Header title="User Management" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-black rounded-lg transition-colors text-sm font-medium font-body"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        <div className="bg-base-surface rounded-xl border border-base-border/50 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-text-muted">
                <th className="text-left p-3 font-body">ID</th>
                <th className="text-left p-3 font-body">Username</th>
                <th className="text-left p-3 font-body">Role</th>
                <th className="text-left p-3 font-body">Department</th>
                <th className="text-left p-3 font-body">Active</th>
                <th className="text-left p-3 font-body">Created</th>
                <th className="text-right p-3 font-body">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-base-border/50 hover:bg-base-border/20">
                  <td className="p-3 font-mono text-text-primary">#{u.id}</td>
                  <td className="p-3 font-mono text-text-primary">{u.username}</td>
                  <td className="p-3"><StatusBadge status={u.role} /></td>
                  <td className="p-3 text-text-primary">{u.department || '—'}</td>
                  <td className="p-3">
                    <button onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`p-1 rounded transition-colors ${u.is_active ? 'text-success hover:text-success/70' : 'text-text-muted hover:text-text-primary'}`}
                      title={u.is_active ? 'Deactivate user' : 'Activate user'}>
                      {u.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-text-muted text-xs">{u.created_at}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.username === 'admin'}
                      className="p-2 text-text-muted hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={u.username === 'admin' ? 'Cannot delete default admin' : 'Delete user'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="400px" showClose={false}>
        <div className="p-6 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-text-primary font-body">Delete User</h3>
            <p className="text-sm text-text-muted mt-1">Are you sure you want to delete <span className="font-mono text-text-primary">{deleteTarget?.username}</span>?</p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 bg-base-border hover:bg-base-border/80 text-text-muted rounded-lg transition-colors text-sm font-body">Cancel</button>
            <button onClick={handleDelete}
              className="px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg transition-colors text-sm font-body">Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
