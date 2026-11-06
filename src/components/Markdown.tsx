import { Fragment, type ReactNode } from 'react'

// Renderizador de texto formatado (Markdown simples), sem HTML cru: tudo vira elemento React, então não há risco de script.
// Suporta: # títulos, **negrito**, *itálico*, `código`, [texto](link), listas (- ou 1.), > citação, --- linha e ``` blocos.

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))|(https?:\/\/[^\s<)]+)/g

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const key = `${m.index}-${t.length}`
    if (m[1]) out.push(<code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-800">{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={key}>{inline(t.slice(2, -2))}</strong>)
    else if (m[3]) out.push(<em key={key}>{inline(t.slice(1, -1))}</em>)
    else if (m[4]) {
      const mm = /^\[([^\]]+)\]\((.+)\)$/.exec(t)!
      out.push(<a key={key} href={mm[2]} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">{mm[1]}</a>)
    } else out.push(<a key={key} href={t} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline underline-offset-2 hover:opacity-80">{t}</a>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  const k = () => blocks.length

  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }

    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i++]!)
      i++
      blocks.push(<pre key={k()} className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">{code.join('\n')}</pre>)
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1]!.length
      const cls = level === 1 ? 'text-xl font-bold' : level === 2 ? 'text-lg font-semibold' : 'text-base font-semibold'
      blocks.push(<p key={k()} role="heading" aria-level={level} className={`${cls} mt-2 tracking-tight`}>{inline(h[2]!)}</p>)
      i++; continue
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { blocks.push(<hr key={k()} className="border-slate-200 dark:border-slate-700" />); i++; continue }
    if (line.startsWith('>')) {
      const q: string[] = []
      while (i < lines.length && lines[i]!.startsWith('>')) q.push(lines[i++]!.replace(/^>\s?/, ''))
      blocks.push(<blockquote key={k()} className="border-l-4 border-slate-300 pl-3 text-slate-600 dark:border-slate-600 dark:text-slate-300">{inline(q.join(' '))}</blockquote>)
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*]\s+/, ''))
      blocks.push(<ul key={k()} className="list-disc space-y-1 pl-6">{items.map((it, n) => <li key={n}>{inline(it)}</li>)}</ul>)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*\d+[.)]\s+/, ''))
      blocks.push(<ol key={k()} className="list-decimal space-y-1 pl-6">{items.map((it, n) => <li key={n}>{inline(it)}</li>)}</ol>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|>|```|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i]!)) para.push(lines[i++]!)
    blocks.push(
      <p key={k()} className="leading-relaxed">
        {para.map((l, n) => <Fragment key={n}>{n > 0 && <br />}{inline(l)}</Fragment>)}
      </p>,
    )
  }

  return <div className={`space-y-3 text-sm ${className ?? ''}`}>{blocks}</div>
}
