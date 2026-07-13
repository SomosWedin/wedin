import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGifts } from '@/actions/data/gift';
import { getGiftlists } from '@/actions/data/giftlist';
import { getEvent } from '@/actions/data/event';
import { getWishlistGifts } from '@/actions/data/wishlist-gift';
import { getCategories } from '@/actions/data/category';
import GiftRow from '@/components/dashboard/gift-row';
import GiftsFilterBar from '@/components/dashboard/gifts-filter-bar';
import CreateGiftDialog from '@/components/dialog/create-gift-dialog';
import { IoGiftOutline } from 'react-icons/io5';
import { PiPackageFill } from 'react-icons/pi';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function GiftsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const event = await getEvent();

  if (!event || 'error' in event) {
    return <div>Error</div>;
  }

  const [gifts, giftlists, wishlistGifts, categories] = await Promise.all([
    getGifts({ searchParams }),
    getGiftlists({ searchParams }),
    getWishlistGifts({ searchParams: { wishlistId: event.wishlistId } }),
    getCategories(),
  ]);

  const wishlistGiftIds = new Set(
    wishlistGifts
      .filter(wishlistGift => !wishlistGift.isReceived)
      .map(wishlistGift => wishlistGift.giftId)
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/wishlist"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2 gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Link>
            <h1 className="text-3xl font-black">Agregar regalos</h1>
            <p className="text-textTertiary mt-2">
              Explorá los regalos disponibles y agregalos a tu lista, o creá los
              tuyos propios.
            </p>
          </div>
          <CreateGiftDialog
            eventId={event.id}
            wishlistId={event.wishlistId}
            categories={categories}
          />
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList className="gap-3">
              <TabsTrigger value="todos" className="gap-2">
                <IoGiftOutline className="text-lg" />
                Todos los productos
              </TabsTrigger>
              <TabsTrigger value="predefinidas" className="gap-2">
                <PiPackageFill className="text-lg" />
                Listas predefinidas
              </TabsTrigger>
            </TabsList>

            <GiftsFilterBar categories={categories} />
          </div>

          <TabsContent value="todos" className="mt-6">
            <div className="bg-white rounded-lg">
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
                      eventId={event.id}
                      wishlistId={event.wishlistId}
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
                          .reduce(
                            (sum, gift) => sum + Number(gift.price || 0),
                            0
                          )
                          .toLocaleString()}
                      </p>
                    </div>
                    <Button
                      className="hover:bg-gray100 transition-colors"
                      variant="outline"
                      asChild
                      size="lg"
                    >
                      <Link href={`/gifts/lists/${giftlist.id}`}>
                        Ver paquete
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
