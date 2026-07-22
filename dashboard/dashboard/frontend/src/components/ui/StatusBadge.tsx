import { memo } from 'react'

interface StatusBadgeProps {
  status: string
}

function StatusBadgeInner({ status }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    APPROVED: 'bg-success/20 text-success',
    BLOCKED: 'bg-danger/20 text-danger',
    PENDING: 'bg-warning/20 text-warning',
    WARNING: 'bg-warning/20 text-warning',
    ERROR: 'bg-danger/20 text-danger',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-mono ${colorMap[status] || 'bg-base-border text-text-muted'}`}>
      {status}
    </span>
  )
}

const StatusBadge = memo(StatusBadgeInner)
export default StatusBadge
