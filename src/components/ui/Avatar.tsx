import { initials } from '@/lib/utils'

export function Avatar({ nome, src, size = 24 }: { nome: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  return src
    ? <img src={src} alt={nome} title={nome} style={style} className="relative rounded-full object-cover transition-transform duration-200 hover:z-10 hover:scale-125" />
    : <span title={nome} style={style}
        className="relative inline-grid shrink-0 transition-transform duration-200 hover:z-10 hover:scale-125 place-items-center rounded-full bg-slate-300 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
        {initials(nome)}
      </span>
}
