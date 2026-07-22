import { memo, type ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: string
}

function StatCardInner({ title, value, icon, color = 'text-accent' }: StatCardProps) {
  return (
    <div className="bg-base-surface p-5 rounded-xl border border-base-border/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted font-medium font-body">{title}</p>
          <p className="text-3xl font-bold font-mono text-text-primary mt-2">{value}</p>
        </div>
        <div className={`${color}`}>{icon}</div>
      </div>
    </div>
  )
}

const StatCard = memo(StatCardInner)
export default StatCard
