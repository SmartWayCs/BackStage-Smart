import { useToasts } from '@/lib/toast'

export function Toaster() {
  const items = useToasts()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow-lg">{t.message}</div>
      ))}
    </div>
  )
}
