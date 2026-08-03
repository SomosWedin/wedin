'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTransition } from 'react'
import { IoGiftOutline } from 'react-icons/io5'
import { PiSquaresFour } from 'react-icons/pi'
import type { getCategories } from '@/actions/data/category'
import type { getGifts } from '@/actions/data/gift'
import type { getGiftlists } from '@/actions/data/giftlist'
import GiftRow from '@/components/dashboard/gift-row'
import GiftsFilterBar from '@/components/dashboard/gifts-filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type GiftsCatalogSectionProps = {
  gifts: Awaited<ReturnType<typeof getGifts>>
  giftlists: Awaited<ReturnType<typeof getGiftlists>>
  categories: Awaited<ReturnType<typeof getCategories>>
  eventId: string
  wishlistId: string
  wishlistGiftIds: Set<string>
}

export default function GiftsCatalogSection({
  gifts,
  giftlists,
  categories,
  eventId,
  wishlistId,
  wishlistGiftIds,
}: GiftsCatalogSectionProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <Tabs defaultValue="todos" className="w-full">
      <div className="flex flex-col lg:flex-row items-center sm:items-start justify-between gap-4 mb-6">
        <TabsList className="gap-2 sm:gap-3">
          <TabsTrigger value="todos" className="gap-2 text-xs sm:text-sm">
            <IoGiftOutline className="text-lg" />
            Todos los productos
          </TabsTrigger>
          <TabsTrigger
            value="predefinidas"
            className="gap-2 text-xs sm:text-sm"
          >
            <PiSquaresFour className="text-lg" />
            Listas predefinidas
          </TabsTrigger>
        </TabsList>

        <GiftsFilterBar
          categories={categories}
          startTransition={startTransition}
        />
      </div>

      <TabsContent value="todos" className="mt-6">
        <div
          className={`bg-white rounded-lg transition-opacity ${
            isPending ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-t-lg text-sm font-medium text-gray-600">
              <div className="col-span-4">Nombre y categoría</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Precio</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2"></div>
            </div>

            {gifts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No se encontraron regalos
              </div>
            ) : (
              gifts.map(gift => (
                <GiftRow
                  key={gift.id}
                  gift={gift}
                  eventId={eventId}
                  wishlistId={wishlistId}
                  categories={categories}
                  isInWishlist={wishlistGiftIds.has(gift.id)}
                />
              ))
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="predefinidas" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {giftlists.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-500">
              No se encontraron listas predefinidas
            </div>
          ) : (
            giftlists.map(giftlist => (
              <div
                key={giftlist.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
              >
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {giftlist.gifts.slice(0, 4).map(gift => (
                    <div
                      key={gift.id}
                      className="aspect-square bg-gray-200 rounded flex items-center justify-center overflow-hidden"
                    >
                      {gift.image?.url ? (
                        <Image
                          src={gift.image.url}
                          alt={gift.name}
                          className="w-full h-full object-cover"
                          width={200}
                          height={200}
                        />
                      ) : (
                        <IoGiftOutline className="text-3xl text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  <Badge className="w-fit bg-gray100 text-textTertiary border-transparent">
                    {giftlist.gifts.length} productos
                  </Badge>
                  <h3 className="text-lg font-bold">{giftlist.name}</h3>
                  <p className="text-lg font-semibold">
                    Gs.{' '}
                    {giftlist.gifts
                      .reduce((sum, gift) => sum + Number(gift.price || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <Button
                  className="hover:bg-gray100 transition-colors"
                  variant="outline"
                  asChild
                  size="lg"
                >
                  <Link href={`/gifts/lists/${giftlist.id}`}>Ver paquete</Link>
                </Button>
              </div>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
