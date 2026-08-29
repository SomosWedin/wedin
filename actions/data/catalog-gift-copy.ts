import type { Prisma } from '@prisma/client'

type CatalogGiftCopyWriter = Pick<
  Prisma.TransactionClient,
  'gift' | 'wishlistGift'
>

export type CatalogGiftWithWishlistLinks = {
  id: string
  name: string
  price: string
  categoryId: string
  image: { url: string | null } | null
  wishlistGifts: Array<{ id: string; eventId: string }>
}

export function catalogGiftContentChanged(
  gift: Pick<
    CatalogGiftWithWishlistLinks,
    'name' | 'price' | 'categoryId' | 'image'
  >,
  values: {
    name: string
    price: string
    categoryId: string
    imageUrl: string
  }
) {
  return (
    gift.name !== values.name ||
    gift.price !== values.price ||
    gift.categoryId !== values.categoryId ||
    (gift.image?.url ?? '') !== values.imageUrl
  )
}

export async function copyCatalogGiftForWishlistLinks(
  client: CatalogGiftCopyWriter,
  gift: CatalogGiftWithWishlistLinks,
  categoryId = gift.categoryId,
  wishlistGifts = gift.wishlistGifts
) {
  for (const wishlistGift of wishlistGifts) {
    const privateGift = await client.gift.create({
      data: {
        name: gift.name,
        price: gift.price,
        category: { connect: { id: categoryId } },
        event: { connect: { id: wishlistGift.eventId } },
        giftlists: { connect: [] },
        isDefault: false,
        ...(gift.image?.url
          ? { image: { create: { url: gift.image.url } } }
          : {}),
      },
    })

    await client.wishlistGift.update({
      where: { id: wishlistGift.id },
      data: { giftId: privateGift.id },
    })
  }
}
