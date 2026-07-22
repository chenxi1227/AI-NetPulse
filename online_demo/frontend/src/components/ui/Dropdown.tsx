import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string | number
  label: string
}

interface DropdownProps {
  value: string | number
  onChange: (value: string | number) => void
  options: Option[]
  className?: string
}

export default function Dropdown({ value, onChange, options, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuId = useRef(`d-${Math.random().toString(36).slice(2, 9)}`)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  function updatePos() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      const menuEl = document.getElementById(menuId.current)
      if (btnRef.current && !btnRef.current.contains(target) && menuEl && !menuEl.contains(target)) {
        setOpen(false)
      }
    }
    function onScroll() { setOpen(false) }
    function onResize() { setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setOpen(!open); if (!open) updatePos() }}
        className="flex items-center justify-between gap-2 w-full bg-base-border text-text-primary rounded-lg px-4 py-2 border border-base-border font-body text-sm"
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          id={menuId.current}
          className="fixed z-[9999] rounded-lg border border-base-border overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: pos.width, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-sm transition-colors font-body ${
                opt.value === value
                  ? 'text-accent bg-accent/10'
                  : 'text-text-primary hover:bg-base-border/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
