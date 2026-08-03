'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { z } from 'zod'
import { updateTransactionNotes } from '@/actions/data/transaction'
import { useToast } from '@/hooks/use-toast'
import type { TransactionEditSchema } from '@/schemas/form'

export function useTransaction() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const thankTransaction = async (
    transactionId: string,
    values: z.infer<typeof TransactionEditSchema>
  ) => {
    setLoading(true)
    const response = await updateTransactionNotes(transactionId, values)

    if (response.error) {
      toast({
        title: 'Error al enviar el agradecimiento',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({ title: 'Agradecimiento guardado. 💌' })
    router.refresh()
    setLoading(false)
    return response
  }

  return {
    loading,
    thankTransaction,
  }
}
