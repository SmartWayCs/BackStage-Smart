import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, FileText, ImagePlus, Trash2, X } from 'lucide-react'
import { isImageName } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useSignedUrls } from './api'
import type { Attachment } from '@/types/database.types'

const MAX_BYTES = 10 * 1024 * 1024

/** Botão que abre o seletor de arquivos (várias imagens/PDFs de até 10 MB). */
export function UploadButton({ onFiles, busy, label = 'Adicionar imagens' }: { onFiles: (files: File[]) => void; busy?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  function pick(files: FileList | null) {
    const ok: File[] = []
    for (const f of Array.from(files ?? [])) {
      if (f.size > MAX_BYTES) toast(`“${f.name}” passa de 10 MB.`)
      else ok.push(f)
    }
    if (ok.length) onFiles(ok)
    if (input.current) input.current.value = ''
  }
  return (
    <>
      <input ref={input} type="file" multiple hidden accept="image/*,application/pdf" onChange={(e) => pick(e.target.files)} />
      <button type="button" className="btn-ghost rounded-lg border border-dashed border-slate-300 dark:border-slate-600" disabled={busy} onClick={() => input.current?.click()}>
        <ImagePlus size={14} />{busy ? 'Enviando…' : label}
      </button>
    </>
  )
}

/** Tela cheia para ver a imagem em tamanho grande, com setas para navegar. */
function Lightbox({ images, urls, start, onClose }: { images: Attachment[]; urls: Record<string, string>; start: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const cur = images[i]!
  const url = urls[cur.arquivo_url]
  return createPortal(
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/85 p-4" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Imagem ampliada">
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      {images.length > 1 && <>
        <button className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onMouseDown={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={24} /></button>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onMouseDown={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label="Próxima"><ChevronRight size={24} /></button>
      </>}
      <figure className="flex max-h-full max-w-5xl flex-col items-center gap-3" onMouseDown={(e) => e.stopPropagation()}>
        {url ? <img src={url} alt={cur.nome} className="max-h-[80vh] rounded-lg object-contain shadow-2xl" /> : <div className="skeleton h-64 w-96" />}
        <figcaption className="flex items-center gap-3 text-sm text-white/80">
          <span>{cur.nome}</span><span className="tabular-nums text-white/50">{i + 1}/{images.length}</span>
          {url && <a href={url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-white"><Download size={14} />Abrir</a>}
        </figcaption>
      </figure>
    </div>,
    document.body,
  )
}

/** Grade de miniaturas (imagens) e chips (outros arquivos). Clique abre a imagem grande. */
export function Gallery({ items, canEdit, onDelete, empty = 'Nenhuma imagem ainda.' }: { items: Attachment[]; canEdit: boolean; onDelete: (a: Attachment) => void; empty?: string }) {
  const urls = useSignedUrls(items.map((a) => a.arquivo_url)).data ?? {}
  const [open, setOpen] = useState<number | null>(null)
  const images = items.filter((a) => isImageName(a.nome))
  const files = items.filter((a) => !isImageName(a.nome))

  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>
  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((a, idx) => (
            <li key={a.id} className="group relative aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <button type="button" className="size-full" onClick={() => setOpen(idx)} aria-label={`Ampliar ${a.nome}`}>
                {urls[a.arquivo_url]
                  ? <img src={urls[a.arquivo_url]} alt={a.nome} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                  : <span className="skeleton block size-full" />}
              </button>
              {canEdit && (
                <button type="button" className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100" aria-label={`Excluir ${a.nome}`}
                  onClick={() => { if (window.confirm(`Excluir “${a.nome}”?`)) onDelete(a) }}><Trash2 size={13} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm dark:border-slate-700">
              <FileText size={14} className="text-slate-400" />
              {urls[a.arquivo_url] ? <a className="max-w-48 truncate hover:underline" href={urls[a.arquivo_url]} target="_blank" rel="noopener">{a.nome}</a> : <span className="max-w-48 truncate">{a.nome}</span>}
              {canEdit && <button type="button" className="text-slate-400 hover:text-red-600" aria-label={`Excluir ${a.nome}`} onClick={() => { if (window.confirm(`Excluir “${a.nome}”?`)) onDelete(a) }}><Trash2 size={13} /></button>}
            </li>
          ))}
        </ul>
      )}
      {open !== null && <Lightbox images={images} urls={urls} start={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
