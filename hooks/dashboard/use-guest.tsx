'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { z } from 'zod'
import {
  createGuest,
  deleteGuest,
  updateGuestStatus,
} from '@/actions/data/guest'
import { useToast } from '@/hooks/use-toast'
import type {
  GuestCreateSchema,
  GuestDeleteSchema,
  GuestStatusUpdateSchema,
} from '@/schemas/form'

export function useGuest() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const addGuest = async (values: z.infer<typeof GuestCreateSchema>) => {
    setLoading(true)
    const response = await createGuest(values)

    if (response.error) {
      toast({
        title: 'Error al agregar el invitado',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({ title: 'Invitado agregado. 🎉' })
    router.refresh()
    setLoading(false)
    return response
  }

  const setGuestStatus = async (
    values: z.infer<typeof GuestStatusUpdateSchema>
  ) => {
    const response = await updateGuestStatus(values)

    if (response.error) {
      toast({
        title: 'Error al actualizar el invitado',
        description: response.error,
        variant: 'destructive',
      })
      return response
    }

    router.refresh()
    return response
  }

  const removeGuest = async (values: z.infer<typeof GuestDeleteSchema>) => {
    const response = await deleteGuest(values)

    if (response.error) {
      toast({
        title: 'Error al eliminar el invitado',
        description: response.error,
        variant: 'destructive',
      })
      return response
    }

    toast({ title: 'Invitado eliminado.' })
    router.refresh()
    return response
  }

  return {
    loading,
    addGuest,
    setGuestStatus,
    removeGuest,
  }
}
