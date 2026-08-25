'use client'

import type { Gift, Image as ImageModel } from '@prisma/client'
import GiftContributionForm from '@/components/forms/dialog/gift-contribution'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type GiftContributionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gift: Gift & {
    image: ImageModel | null
  }
  isFavoriteGift: boolean
  remaining: number
  percentage: number
  onAddToCart: (amount: string) => void
  initialAmount?: string
}

export default function GiftContributionDialog({
  open,
  onOpenChange,
  gift,
  isFavoriteGift,
  remaining,
  percentage,
  onAddToCart,
  initialAmount,
}: GiftContributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Detalles del producto</DialogTitle>
        </DialogHeader>

        <GiftContributionForm
          open={open}
          gift={gift}
          isFavoriteGift={isFavoriteGift}
          remaining={remaining}
          percentage={percentage}
          initialAmount={initialAmount}
          onAddToCart={onAddToCart}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}
