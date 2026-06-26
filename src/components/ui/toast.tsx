'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  isVisible: boolean
  onClose: () => void
  /** Label shown above the message. Defaults to "Notificación" */
  label?: string
}

export default function Toast({ message, type, isVisible, onClose, label = 'Notificación' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    ),
  }

  const styles = {
    success: {
      border: 'border-green-100',
      text: 'text-green-600',
      leftBorder: 'border-l-green-500',
    },
    error: {
      border: 'border-red-100',
      text: 'text-red-600',
      leftBorder: 'border-l-red-500',
    },
    warning: {
      border: 'border-yellow-100',
      text: 'text-yellow-600',
      leftBorder: 'border-l-yellow-500',
    },
    info: {
      border: 'border-blue-100',
      text: 'text-blue-600',
      leftBorder: 'border-l-[var(--ws-midnight)]',
    },
  }

  const currentStyle = styles[type]

  return (
    <div
      className="
        fixed
        bottom-8
        right-8
        z-[120]
        animate-[toastSlideIn_2.5s_cubic-bezier(0.22,1,0.36,1)]
      "
    >
      <div
        className={`flex items-center gap-4 p-4 rounded-[20px] bg-white border ${currentStyle.border} shadow-2xl min-w-[320px] border-l-4 ${currentStyle.leftBorder}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 ${currentStyle.text} font-black text-lg`}
        >
          {icons[type]}
        </div>

        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--ws-slate)] mb-0.5">
            {label}
          </p>

          <p className="text-sm font-bold text-[var(--ws-midnight)] leading-tight">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-300"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  )
}
