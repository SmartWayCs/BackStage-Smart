import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="btn-ghost px-2" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
