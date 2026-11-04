import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from './toast'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
  mutationCache: new MutationCache({
    onError: (error) => toast(error instanceof Error ? error.message : 'Erro inesperado'),
  }),
})
