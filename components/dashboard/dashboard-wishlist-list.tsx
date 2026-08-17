'use client'

import type { Category, Prisma } from '@prisma/client'
import Image from 'next/image'
import { useState } from 'react'
import {
  IoCashOutline,
  IoGiftOutline,
  IoSearchOutline,
  IoSparkles,
} from 'react-icons/io5'
import GiftFavoriteBadge from '@/components/dashboard/gift-favorite-badge'
import GiftTypeBadge from '@/components/dashboard/gift-type-badge'
import DeleteWishlistGiftDialog from '@/components/dialog/delete-wishlist-gift-dialog'
import EditWishlistGiftDialog from '@/components/dialog/edit-wishlist-gift-dialog'
import { computePercentage } from '@/components/guest/gift-progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useWishlistGift } from '@/hooks/dashboard/use-wishlist-gift'

type WishlistGiftWithGift = Prisma.WishlistGiftGetPayload<{
  include: { gift: { include: { image: true } } }
}>

type DashboardWishlistListProps = {
  eventId: string
  wishlistId: string
  wishlistGifts: WishlistGiftWithGift[]
  categories: Category[]
}

const ESTADO_OPTIONS = [
  { value: 'received', label: 'Regalo recibido' },
  { value: 'open_contribution', label: 'Contribución abierta' },
  { value: 'in_list', label: 'En lista' },
  { value: 'archived', label: 'Archivado' },
] as const

function getEstado(wishlistGift: WishlistGiftWithGift) {
  const price = Number(wishlistGift.gift.price) || 0
  const contributed = Number(wishlistGift.groupGiftParts) || 0
  const groupPercentage = computePercentage(price, contributed)

  if (wishlistGift.isReceived) {
    return {
      status: 'archived' as const,
      label: 'Archivado',
      percentage: wishlistGift.isFullyPaid ? 100 : groupPercentage,
      className: 'bg-gray100 text-textTertiary border-transparent',
    }
  }

  if (wishlistGift.isFullyPaid || wishlistGift.isManuallyReceived) {
    return {
      status: 'received' as const,
      label: 'Regalo recibido',
      percentage: 100,
      className: 'bg-success/10 text-success border-transparent',
    }
  }

  if (wishlistGift.isGroupGift) {
    return {
      status: 'open_contribution' as const,
      label: 'Contribución abierta',
      percentage: groupPercentage,
      className: 'bg-warning/10 text-warning border-transparent',
    }
  }

  return {
    status: 'in_list' as const,
    label: 'En lista',
    percentage: 0,
    className: 'bg-gray100 text-textTertiary border-transparent',
  }
}

export default function DashboardWishlistList({
  eventId,
  wishlistId,
  wishlistGifts,
  categories,
}: DashboardWishlistListProps) {
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const { setManuallyReceived } = useWishlistGift()

  const handleToggleManuallyReceived = async (
    wishlistGiftId: string,
    isManuallyReceived: boolean
  ) => {
    setTogglingIds(previous => new Set(previous).add(wishlistGiftId))
    await setManuallyReceived({ wishlistGiftId, isManuallyReceived })
    setTogglingIds(previous => {
      const next = new Set(previous)
      next.delete(wishlistGiftId)
      return next
    })
  }

  const categoryNameById = new Map(
    categories.map(category => [category.id, category.name])
  )
  const activeWishlistGifts = wishlistGifts.filter(
    wishlistGift => !wishlistGift.isReceived
  )
  const addedGiftCount = activeWishlistGifts.length
  const totalGiftsValue = activeWishlistGifts.reduce(
    (sum, wishlistGift) => sum + (Number(wishlistGift.gift.price) || 0),
    0
  )

  const filteredWishlistGifts = wishlistGifts.filter(wishlistGift => {
    const estado = getEstado(wishlistGift)

    if (!estadoFilter && estado.status === 'archived') return false

    const matchesSearch = wishlistGift.gift.name
      .toLowerCase()
      .includes(search.trim().toLowerCase())
    const matchesEstado = !estadoFilter || estado.status === estadoFilter
    const matchesCategory =
      !categoryFilter || wishlistGift.gift.categoryId === categoryFilter

    return matchesSearch && matchesEstado && matchesCategory
  })

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 max-h-[unset] sm:max-h-24">
        <div className="flex flex-col gap-1 p-4 sm:p-6 w-full justify-center">
          <h2 className="text-lg font-bold">Regalos agregados a tu lista</h2>
        </div>
        <div className="flex gap-3 items-center p-4 sm:p-6 w-full sm:w-1/2">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoGiftOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{addedGiftCount}</span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Regalos agregados
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 sm:p-6 w-full sm:w-1/2">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoCashOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-textPrimary">
              Gs. {totalGiftsValue.toLocaleString('es-PY')}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              en tu lista de regalos
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Regalo"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Estado: Todos</option>
          {ESTADO_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={categoryFilter}
          onChange={event => setCategoryFilter(event.target.value)}
        >
          <option value="">Categoría: Todas</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-3">Nombre y categoría</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Precio</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1">Recibido</div>
          <div className="col-span-2" />
        </div>

        {filteredWishlistGifts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron regalos
          </div>
        )}

        {filteredWishlistGifts.map(wishlistGift => {
          const estado = getEstado(wishlistGift)

          return (
            <div
              key={wishlistGift.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 group hover:bg-gray-50"
            >
              <div className="flex col-span-3 gap-3 items-center">
                <div className="flex overflow-hidden justify-center items-center w-12 h-12 bg-gray-200 rounded">
                  {wishlistGift.gift.image?.url ? (
                    <Image
                      src={wishlistGift.gift.image.url}
                      alt={wishlistGift.gift.name}
                      className="object-cover w-full h-full"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <IoGiftOutline className="text-2xl text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{wishlistGift.gift.name}</p>
                  <p className="text-sm text-gray-500">
                    {categoryNameById.get(wishlistGift.gift.categoryId) ??
                      'Sin categoría'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col col-span-2 gap-1.5 items-start">
                <GiftTypeBadge isGroupGift={wishlistGift.isGroupGift} />
                {wishlistGift.isFavoriteGift && <GiftFavoriteBadge />}
              </div>

              <div className="col-span-2 text-sm">
                <p>
                  Gs.{Number(wishlistGift.gift.price).toLocaleString('es-PY')}
                </p>
                {!wishlistGift.isGroupGift && wishlistGift.quantity > 1 && (
                  <p className="text-gray-500">
                    {wishlistGift.reservedQuantity} de {wishlistGift.quantity}{' '}
                    recibido{wishlistGift.reservedQuantity === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              <div className="flex col-span-2 gap-2 items-center text-sm">
                <Badge className={estado.className}>
                  <IoSparkles className="mr-1" />
                  {estado.label}
                </Badge>
                {wishlistGift.isGroupGift &&
                  estado.status === 'open_contribution' && (
                    <span className="text-gray-500">{estado.percentage}%</span>
                  )}
              </div>

              <div className="flex col-span-1 gap-2 items-center">
                {!wishlistGift.isReceived && (
                  <>
                    <span className="text-xs text-gray-500 sm:hidden">
                      Recibido
                    </span>
                    <Switch
                      checked={
                        wishlistGift.isFullyPaid ||
                        wishlistGift.isManuallyReceived
                      }
                      disabled={
                        wishlistGift.isFullyPaid ||
                        togglingIds.has(wishlistGift.id)
                      }
                      onCheckedChange={checked =>
                        handleToggleManuallyReceived(wishlistGift.id, checked)
                      }
                    />
                  </>
                )}
              </div>

              {!wishlistGift.isReceived && (
                <div className="flex col-span-2 gap-2 justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <EditWishlistGiftDialog
                    wishlistGiftId={wishlistGift.id}
                    wishlistId={wishlistId}
                    eventId={eventId}
                    gift={wishlistGift.gift}
                    categories={categories}
                    isFavoriteGift={wishlistGift.isFavoriteGift}
                    isGroupGift={wishlistGift.isGroupGift}
                    quantity={wishlistGift.quantity}
                    minQuantity={wishlistGift.reservedQuantity}
                    lockPrice={
                      !wishlistGift.isGroupGift &&
                      wishlistGift.reservedQuantity > 0
                    }
                  />
                  <DeleteWishlistGiftDialog
                    wishlistId={wishlistId}
                    giftId={wishlistGift.giftId}
                    giftName={wishlistGift.gift.name}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
