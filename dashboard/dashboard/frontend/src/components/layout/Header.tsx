import { memo } from 'react'

interface HeaderProps {
  title: string
}

function HeaderInner({ title }: HeaderProps) {
  return (
    <header className="h-16 border-b border-base-border flex items-center pl-14 lg:pl-6 pr-6 flex-shrink-0 sticky top-0 z-10 header-glass">
      <h1 className="font-body font-semibold text-lg text-text-primary">{title}</h1>
    </header>
  )
}

const Header = memo(HeaderInner)
export default Header
