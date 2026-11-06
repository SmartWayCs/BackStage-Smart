import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

/** Mostra os dados de acesso uma única vez, com botão de copiar. */
export function CredentialsDialog({ title, intro, text, onClose }: { title: string; intro: React.ReactNode; text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p>{intro}</p>
        <pre className="rounded-md bg-slate-100 p-3 font-mono text-xs dark:bg-slate-800">{text}</pre>
        <p className="rounded-md bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          No primeiro acesso, a pessoa será obrigada a escolher uma senha nova. Esta senha não será mostrada de novo.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={copy}>{copied ? <><Check size={14} />Copiado</> : <><Copy size={14} />Copiar dados</>}</button>
          <button className="btn-primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </Dialog>
  )
}
