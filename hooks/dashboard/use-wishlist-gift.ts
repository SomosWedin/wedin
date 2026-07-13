'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createWishlistGift,
  createWishlistGifts,
  deleteWishlistGift,
  editWishlistGift,
} from '@/actions/data/wishlist-gift';
import { useToast } from '@/hooks/use-toast';
import type {
  WishlistGiftCreateSchema,
  WishlistGiftDeleteSchema,
  WishlistGiftEditSchema,
  WishlistGiftsCreateSchema,
} from '@/schemas/form';
import type { z } from 'zod';

export function useWishlistGift() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const addToWishlist = async (
    values: z.infer<typeof WishlistGiftCreateSchema>
  ) => {
    setLoading(true);
    const response = await createWishlistGift(values);

    if (response.error) {
      toast({
        title: 'Error al agregar el regalo',
        description: response.error,
        variant: 'destructive',
      });
      setLoading(false);
      return response;
    }

    toast({ title: 'Regalo agregado a tu lista. 🎁' });
    router.refresh();
    setLoading(false);
    return response;
  };

  const removeFromWishlist = async (
    values: z.infer<typeof WishlistGiftDeleteSchema>
  ) => {
    setLoading(true);
    const response = await deleteWishlistGift(values);

    if (response.error) {
      toast({
        title: 'Error al eliminar el regalo',
        description: response.error,
        variant: 'destructive',
      });
      setLoading(false);
      return response;
    }

    toast({ title: 'Regalo eliminado de tu lista.' });
    router.refresh();
    setLoading(false);
    return response;
  };

  const addAllToWishlist = async (
    values: z.infer<typeof WishlistGiftsCreateSchema>
  ) => {
    setLoading(true);
    const response = await createWishlistGifts(values);

    if (response.error) {
      toast({
        title: 'Error al agregar el paquete',
        description: response.error,
        variant: 'destructive',
      });
      setLoading(false);
      return response;
    }

    toast({ title: 'Paquete agregado a tu lista. 🎁' });
    router.refresh();
    setLoading(false);
    return response;
  };

  const updateWishlistGift = async (
    values: z.infer<typeof WishlistGiftEditSchema>
  ) => {
    setLoading(true);
    const response = await editWishlistGift(values);

    if (response.error) {
      toast({
        title: 'Error al editar el regalo',
        description: response.error,
        variant: 'destructive',
      });
      setLoading(false);
      return response;
    }

    toast({ title: 'Regalo actualizado. ✅' });
    router.refresh();
    setLoading(false);
    return response;
  };

  return {
    loading,
    addToWishlist,
    addAllToWishlist,
    removeFromWishlist,
    updateWishlistGift,
  };
}
