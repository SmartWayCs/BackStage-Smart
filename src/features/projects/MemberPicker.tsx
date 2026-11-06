import { X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useProfiles } from './api'

/** Escolha de vários responsáveis: chips removíveis + seletor para adicionar. */
export function MemberPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: profiles = [] } = useProfiles()
  const byId = new Map(profiles.map((p) => [p.id, p]))
  // supervisão não é responsável por projeto, a não ser que já esteja marcada
  const options = profiles.filter((p) => !value.includes(p.id) && p.role !== 'supervisao')

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = byId.get(id)
            return (
              <li key={id} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-1.5 text-sm text-slate-800 transition hover:bg-brand/10 dark:bg-slate-800 dark:text-slate-100">
                <Avatar nome={p?.nome ?? '?'} src={p?.avatar_url} size={22} />
                {p?.nome ?? 'Usuário'}
                <button type="button" aria-label={`Remover ${p?.nome ?? 'responsável'}`} className="rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                  onClick={() => onChange(value.filter((x) => x !== id))}><X size={12} /></button>
              </li>
            )
          })}
        </ul>
      )}
      <select className="input" value="" aria-label="Adicionar responsável" disabled={!options.length}
        onChange={(e) => { if (e.target.value) onChange([...value, e.target.value]) }}>
        <option value="">{options.length ? '+ Adicionar responsável…' : value.length ? 'Todos já adicionados' : 'Nenhum usuário disponível'}</option>
        {options.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
    </div>
  )
}
