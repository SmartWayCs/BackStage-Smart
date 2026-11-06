import clsx from 'clsx'
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/constants'
import type { Priority } from '@/types/database.types'

export function PriorityBadge({ value }: { value: Priority }) {
  return <span className={clsx('hover-pop inline-block rounded px-1.5 py-0.5 text-xs font-medium', PRIORITY_CLASS[value])}>{PRIORITY_LABEL[value]}</span>
}
