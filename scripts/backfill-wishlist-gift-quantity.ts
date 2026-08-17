// Usage: yarn backfill:wishlist-gift-quantity
// See the NOTE above WishlistGift.quantity in prisma/schema.prisma.
// Safe to re-run: every update is scoped to docs still missing the field.
export {} // avoids colliding with prisma/seed.ts's global scope under isolatedModules
const { PrismaClient } = require('@prisma/client')

const prismaClient = new PrismaClient()

async function main() {
  const giftDefaults = await prismaClient.$runCommandRaw({
    update: 'WishlistGift',
    updates: [
      {
        q: { quantity: { $exists: false } },
        u: { $set: { quantity: 1, reservedQuantity: 0 } },
        multi: true,
      },
    ],
  })
  console.log(
    `WishlistGift defaults: matched ${(giftDefaults as any).nModified ?? (giftDefaults as any).n}`
  )

  const activeClaims = await prismaClient.$runCommandRaw({
    update: 'WishlistGift',
    updates: [
      {
        q: {
          isGroupGift: false,
          claimedTransactionId: { $exists: true, $ne: null },
        },
        u: { $set: { reservedQuantity: 1 } },
        multi: true,
      },
    ],
  })
  console.log(
    `WishlistGift active claims: matched ${(activeClaims as any).nModified ?? (activeClaims as any).n}`
  )

  const transactionDefaults = await prismaClient.$runCommandRaw({
    update: 'Transaction',
    updates: [
      {
        q: { quantity: { $exists: false } },
        u: { $set: { quantity: 1 } },
        multi: true,
      },
    ],
  })
  console.log(
    `Transaction defaults: matched ${(transactionDefaults as any).nModified ?? (transactionDefaults as any).n}`
  )

  console.log('Backfill complete. 🎁')
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })
