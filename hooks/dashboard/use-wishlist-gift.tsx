'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { z } from 'zod'
import {
  createWishlistGift,
  createWishlistGifts,
  deleteWishlistGift,
  setWishlistGiftManuallyReceived,
} from '@/actions/data/wishlist-gift'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import type {
  WishlistGiftCreateSchema,
  WishlistGiftDeleteSchema,
  WishlistGiftReceivedToggleSchema,
  WishlistGiftsCreateSchema,
} from '@/schemas/form'

export function useWishlistGift() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const addToWishlist = async (
    values: z.infer<typeof WishlistGiftCreateSchema>
  ) => {
    setLoading(true)
    const response = await createWishlistGift(values)

    if (response.error) {
      toast({
        title: 'Error al agregar el regalo',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({
      title: 'Regalo agregado a tu lista. 🎁',
      action: (
        <ToastAction
          altText="Ver lista"
          onClick={() => router.push('/wishlist')}
        >
          Ver lista
        </ToastAction>
      ),
    })
    router.refresh()
    setLoading(false)
    return response
  }

  const removeFromWishlist = async (
    values: z.infer<typeof WishlistGiftDeleteSchema>
  ) => {
    setLoading(true)
    const response = await deleteWishlistGift(values)

    if (response.error) {
      toast({
        title: 'Error al eliminar el regalo',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({ title: 'Regalo eliminado de tu lista.' })
    router.refresh()
    setLoading(false)
    return response
  }

  const addAllToWishlist = async (
    values: z.infer<typeof WishlistGiftsCreateSchema>
  ) => {
    setLoading(true)
    const response = await createWishlistGifts(values)

    if (response.error) {
      toast({
        title: 'Error al agregar el paquete',
        description: response.error,
        variant: 'destructive',
      })
      setLoading(false)
      return response
    }

    toast({ title: 'Paquete agregado a tu lista. 🎁' })
    router.refresh()
    setLoading(false)
    return response
  }

  const setManuallyReceived = async (
    values: z.infer<typeof WishlistGiftReceivedToggleSchema>
  ) => {
    const response = await setWishlistGiftManuallyReceived(values)

    if (response.error) {
      toast({
        title: 'Error al actualizar el regalo',
        description: response.error,
        variant: 'destructive',
      })
      return response
    }

    toast({
      title: values.isManuallyReceived
        ? 'Marcado como recibido. ✅'
        : 'Marcado como no recibido.',
    })
    router.refresh()
    return response
  }

  return {
    loading,
    addToWishlist,
    addAllToWishlist,
    removeFromWishlist,
    setManuallyReceived,
  }
}
