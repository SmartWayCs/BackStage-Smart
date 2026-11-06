import { useState } from 'react'
import { Dices, Eye, EyeOff } from 'lucide-react'
import { generatePassword } from './api'

/** Campo de senha com mostrar/ocultar e gerar senha aleatória. */
export function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(true)
  return (
    <span className="flex gap-1.5">
      <input className="input font-mono" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password"
        value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="btn-ghost px-2" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button type="button" className="btn-ghost px-2" aria-label="Gerar senha" title="Gerar senha" onClick={() => onChange(generatePassword())}>
        <Dices size={16} />
      </button>
    </span>
  )
}
