import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalState = 'idle' | 'entering' | 'visible' | 'exiting'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  maxWidth?: string
  showClose?: boolean
}

export default function Modal({ open, onClose, children, title, maxWidth = '480px', showClose = true }: ModalProps) {
  const [state, setState] = useState<ModalState>('idle')

  useEffect(() => {
    if (open) setState('entering')
    else if (state !== 'idle') setState('exiting')
  }, [open])

  const handleClose = () => {
    if (state === 'entering' || state === 'visible') setState('exiting')
  }

  const onAnimEnd = () => {
    if (state === 'entering') setState('visible')
    else if (state === 'exiting') {
      setState('idle')
      onClose()
    }
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
    }
  }, [open])

  useEffect(() => {
    if (state === 'idle') document.body.style.overflow = ''
  }, [state])

  if (state === 'idle') return null

  const exiting = state === 'exiting'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
      style={{
        backgroundColor: 'var(--modal-overlay-bg)',
        backdropFilter: exiting ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: exiting ? 'none' : 'blur(12px)',
        animation: exiting ? 'modalFadeOut 200ms ease-out forwards' : 'modalFadeIn 200ms ease-out',
      }}
    >
      <div
        onAnimationEnd={onAnimEnd}
        onClick={e => e.stopPropagation()}
        className="relative w-full mx-4 overflow-y-auto"
        style={{
          maxWidth,
          maxHeight: 'calc(100vh - 4rem)',
          background: 'var(--modal-bg)',
          backdropFilter: exiting ? 'none' : 'blur(48px)',
          WebkitBackdropFilter: exiting ? 'none' : 'blur(48px)',
          borderRadius: '32px',
          boxShadow:
            '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 0 2px 0 rgba(0,0,0,0.02), 0 0 10px 0 rgba(0,0,0,0.03), 0 10px 50px 0 rgba(0,0,0,0.07)',
          animation: exiting ? 'modalScaleOut 200ms ease-out forwards' : 'modalScaleIn 200ms ease-out',
        }}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 pt-6 pb-0">
            {title && <h2 className="text-lg font-medium text-text-primary font-body">{title}</h2>}
            {showClose && (
              <button
                onClick={handleClose}
                className="ml-auto p-1.5 text-text-muted hover:text-text-primary hover:bg-base-border/40 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
