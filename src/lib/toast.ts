import { useSyncExternalStore } from 'react'

export interface ToastItem { id: number; message: string }
let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(message: string) {
  const id = nextId++
  items = [...items, { id, message }]
  emit()
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit() }, 5000)
}

export function useToasts() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => items,
  )
}
