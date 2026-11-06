import { Avatar } from './Avatar'
import type { Profile } from '@/types/database.types'

/** Avatares sobrepostos (até 3) + nome: "Ana" ou "Ana +2". */
export function AvatarStack({ people, max = 3 }: { people: Profile[]; max?: number }) {
  if (!people.length) return <span>Sem responsável</span>
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const label = people.length === 1 ? people[0]!.nome : `${people[0]!.nome.split(' ')[0]} +${people.length - 1}`
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={people.map((p) => p.nome).join(', ')}>
      <span className="flex shrink-0 -space-x-1.5">
        {shown.map((p) => (
          <span key={p.id} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar nome={p.nome} src={p.avatar_url} size={20} /></span>
        ))}
        {extra > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold ring-2 ring-white dark:bg-slate-700 dark:ring-slate-900">+{extra}</span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </span>
  )
}
