'use client'

import type { PayoutStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updatePayoutStatusAsAdmin } from '@/actions/data/payout'
import { useToast } from '@/hooks/use-toast'

export function useAdminPayoutStatus() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const updateStatus = async (payoutId: string, status: PayoutStatus) => {
    setLoading(true)
    const response = await updatePayoutStatusAsAdmin(payoutId, status)

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
