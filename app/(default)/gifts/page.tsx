import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGifts } from '@/actions/data/gift';
import { getGiftlists } from '@/actions/data/giftlist';
import { IoAdd, IoSearchOutline, IoGiftOutline } from 'react-icons/io5';
import { PiPackageFill } from 'react-icons/pi';
import Link from 'next/link';

export default async function GiftsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const gifts = await getGifts({ searchParams });
  const giftlists = await getGiftlists({ searchParams });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/wishlist" className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block">
              ← Volver
            </Link>
            <h1 className="text-3xl font-black">Agregar regalos</h1>
            <p className="text-textTertiary mt-2">
              Lorem ipsum dolor asit meLorem ipsum dolor asit mett
            </p>
          </div>
          <Button variant="success" className="gap-2">
            Crear regalo
            <IoAdd className="text-2xl" />
          </Button>
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="todos" className="gap-2">
                <IoGiftOutline className="text-lg" />
                Todos los productos
              </TabsTrigger>
              <TabsTrigger value="predefinidas" className="gap-2">
                <PiPackageFill className="text-lg" />
                Listas predefinidas
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Regalo"
                  className="pl-10"
                />
              </div>
              <select className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm">
                <option>Categoría</option>
              </select>
            </div>
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
                  gifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 items-center"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <IoGiftOutline className="text-2xl text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium">{gift.name}</p>
                          <p className="text-sm text-gray-500">{gift.categoryId}</p>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <IoGiftOutline className="text-sm" />
                        <span className="text-sm">
                          {gift.giftlistId ? 'Regalo Grupal' : 'Regalo Individual'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm">
                          {gift.price ? `Gs.${Number(gift.price).toLocaleString()}` : 'Sin límite'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-sm">
                          <IoSearchOutline className="text-gray-400" />
                          <span>No agregado</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button variant="success" size="sm" className="gap-2">
                          <IoAdd />
                          Agregar regalo
                        </Button>
                      </div>
                    </div>
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
                giftlists.map((giftlist) => (
                  <div
                    key={giftlist.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {giftlist.gifts.slice(0, 4).map((gift, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-gray-200 rounded flex items-center justify-center"
                        >
                          <IoGiftOutline className="text-3xl text-gray-400" />
                        </div>
                      ))}
                    </div>
                    <div className="mb-2">
                      <p className="text-sm text-gray-500">
                        {giftlist.gifts.length} productos
                      </p>
                      <h3 className="text-lg font-bold mt-1">{giftlist.name}</h3>
                      <p className="text-lg font-semibold mt-1">
                        Gs. {giftlist.gifts.reduce((sum, gift) => sum + Number(gift.price || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      Ver paquete
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