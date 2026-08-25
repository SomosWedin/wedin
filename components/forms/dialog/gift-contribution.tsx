'use client'

import type { Gift, Image as ImageModel } from '@prisma/client'
import Image from 'next/image'
import { IoGiftOutline } from 'react-icons/io5'
import GiftFavoriteBadge from '@/components/dashboard/gift-favorite-badge'
import GiftTypeBadge from '@/components/dashboard/gift-type-badge'
import PriceInput from '@/components/forms/common/price-input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { useGiftContribution } from '@/hooks/dialog/forms/use-gift-contribution'
import { cn } from '@/lib/utils'

type GiftWithImage = Gift & {
  image: ImageModel | null
}

type GiftContributionFormProps = {
  open: boolean
  gift: GiftWithImage
  isFavoriteGift: boolean
  remaining: number
  percentage: number
  initialAmount?: string
  onAddToCart: (amount: string) => void
  onOpenChange: (open: boolean) => void
}

export default function GiftContributionForm({
  open,
  gift,
  isFavoriteGift,
  remaining,
  percentage,
  initialAmount,
  onAddToCart,
  onOpenChange,
}: GiftContributionFormProps) {
  const {
    form,
    amount,
    completeRemaining,
    suggestedAmounts,
    isValid,
    handleAmountChange,
    handleSuggestedAmount,
    handleCompleteRemainingChange,
    handleSubmit,
  } = useGiftContribution({
    open,
    remaining,
    initialAmount,
    onAddToCart,
    onOpenChange,
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
            {gift.image?.url ? (
              <Image
                src={gift.image.url}
                alt={gift.name}
                className="h-full w-full object-cover"
                width={128}
                height={128}
              />
            ) : (
              <IoGiftOutline className="text-3xl text-gray-400" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-base font-normal">{gift.name}</p>

            <p className="text-xl font-medium">
              Gs. {Number(gift.price).toLocaleString('es-PY')}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <GiftTypeBadge isGroupGift />

              {isFavoriteGift && <GiftFavoriteBadge />}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-base">
            <span>Faltan: Gs. {remaining.toLocaleString('es-PY')}</span>

            <span>{percentage}%</span>
          </div>

          <Progress value={percentage} />
        </div>

        {suggestedAmounts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Montos sugeridos</span>

            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map(suggestedAmount => {
                const isSelected =
                  !completeRemaining && amount === String(suggestedAmount)

                return (
                  <button
                    key={suggestedAmount}
                    type="button"
                    onClick={() => handleSuggestedAmount(suggestedAmount)}
                    className={
                      `rounded-full border px-3 py-1.5 ` +
                      `text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-success bg-success/10 text-success'
                          : 'border-gray-200 bg-white text-textPrimary hover:bg-gray-50'
                      }`
                    }
                  >
                    Gs. {suggestedAmount.toLocaleString('es-PY')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel
                className={cn(!fieldState.isDirty && 'text-textPrimary')}
              >
                Monto a contribuir
              </FormLabel>

              <FormControl>
                <PriceInput
                  value={field.value}
                  onChange={handleAmountChange}
                  onBlur={field.onBlur}
                />
              </FormControl>

              {fieldState.isDirty && (
                <FormMessage className="font-normal text-red-600" />
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="completeRemaining"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  id="complete-remaining"
                  checked={field.value}
                  onCheckedChange={handleCompleteRemainingChange}
                />
              </FormControl>

              <FormLabel
                htmlFor="complete-remaining"
                className="!mt-0 cursor-pointer font-normal"
              >
                Completar el valor total del regalo
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="-mx-6 -mb-6 flex justify-end gap-2 rounded-b-lg bg-gray-50 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-[3] border-none bg-gray-100 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="success"
            disabled={!isValid}
            className="flex-[7]"
          >
            Agregar al carrito
          </Button>
        </div>
      </form>
    </Form>
  )
}
