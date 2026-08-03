'use client'

import type { TransactionStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateTransactionStatusAsAdmin } from '@/actions/data/transaction'
import { useToast } from '@/hooks/use-toast'

export function useAdminTransactionStatus() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const updateStatus = async (
    transactionId: string,
    status: TransactionStatus
  ) => {
    setLoading(true)
    const response = await updateTransactionStatusAsAdmin(transactionId, status)

    if (response.error) {
      toast({
        title: 'Error al actualizar el estado',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({ title: 'Estado actualizado.' })
    router.refresh()
    setLoading(false)
    return response
  }

  return {
    loading,
    updateStatus,
  }
}
