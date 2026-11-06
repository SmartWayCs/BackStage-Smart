import { useRef, useState } from 'react'
import { Bold, Code, Eye, Heading2, Italic, Link2, List, ListOrdered, Pencil, Quote } from 'lucide-react'
import clsx from 'clsx'
import { Markdown } from '@/components/Markdown'

/** Editor de texto com formatação: botões para inserir negrito, títulos, listas e links, e uma prévia. */
export function NotesEditor({ value, onChange, readOnly, rows = 12, placeholder }: {
  value: string; onChange: (v: string) => void; readOnly?: boolean; rows?: number; placeholder?: string
}) {
  const [preview, setPreview] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  /** Envolve a seleção (ou insere o modelo) e devolve o cursor no lugar certo. */
  function wrap(before: string, after = before, sample = 'texto') {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const sel = value.slice(s, e) || sample
    onChange(value.slice(0, s) + before + sel + after + value.slice(e))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length) })
  }
  /** Coloca um prefixo no começo de cada linha selecionada (lista, título, citação). */
  function prefix(p: string | ((n: number) => string)) {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const from = value.lastIndexOf('\n', s - 1) + 1
    const block = value.slice(from, e) || 'item'
    const out = block.split('\n').map((l, n) => (typeof p === 'function' ? p(n) : p) + l).join('\n')
    onChange(value.slice(0, from) + out + value.slice(e))
    requestAnimationFrame(() => el.focus())
  }

  if (readOnly) {
    return value.trim() ? <Markdown text={value} /> : <p className="text-sm italic text-slate-400">Nenhuma nota ainda.</p>
  }

  const tools: { icon: typeof Bold; label: string; run: () => void }[] = [
    { icon: Heading2, label: 'Título', run: () => prefix('## ') },
    { icon: Bold, label: 'Negrito', run: () => wrap('**') },
    { icon: Italic, label: 'Itálico', run: () => wrap('*') },
    { icon: List, label: 'Lista', run: () => prefix('- ') },
    { icon: ListOrdered, label: 'Lista numerada', run: () => prefix((n) => `${n + 1}. `) },
    { icon: Quote, label: 'Citação', run: () => prefix('> ') },
    { icon: Code, label: 'Código', run: () => wrap('`') },
    { icon: Link2, label: 'Link', run: () => wrap('[', '](https://)', 'texto do link') },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/60">
        {!preview && tools.map((t) => (
          <button key={t.label} type="button" title={t.label} aria-label={t.label} onClick={t.run}
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"><t.icon size={15} /></button>
        ))}
        <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview}
          className={clsx('ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition', preview ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700')}>
          {preview ? <><Pencil size={13} />Voltar a escrever</> : <><Eye size={13} />Ver prévia</>}
        </button>
      </div>
      {preview
        ? <div className="min-h-[12rem] p-4">{value.trim() ? <Markdown text={value} /> : <p className="text-sm italic text-slate-400">Nada para mostrar ainda.</p>}</div>
        : <textarea ref={ref} className="block w-full resize-y bg-transparent p-3 font-mono text-sm outline-none" rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'Escreva aqui. Use os botões acima para título, negrito, listas e links.'} />}
    </div>
  )
}
