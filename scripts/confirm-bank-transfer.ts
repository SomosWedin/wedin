const { PrismaClient } = require('@prisma/client');

const prismaClient = new PrismaClient();

// Ops-only tool: run after Wedin staff confirm a guest's bank-transfer proof
// (sent via the checkout's WhatsApp link) against the couple's bank account.
// There's no organizer-facing UI for this by design — the couple never sees
// or approves individual transfers, and confirming here keeps
// WishlistGift.isFullyPaid/groupGiftParts in sync the same way the dLocal
// webhook does for card payments.
//
// Usage: yarn confirm-bank-transfer <transactionId> [transactionId...]

async function recomputeWishlistGiftProgress(wishlistGiftId: string) {
  const wishlistGift = await prismaClient.wishlistGift.findUnique({
    where: { id: wishlistGiftId },
    include: {
      gift: true,
      transactions: { where: { status: 'COMPLETED' } },
    },
  });

  if (!wishlistGift) return;

  const price = Number(wishlistGift.gift.price) || 0;
  const contributed = wishlistGift.transactions.reduce(
    (sum: number, transaction: { amount: string }) =>
      sum + (Number(transaction.amount) || 0),
    0
  );

  await prismaClient.wishlistGift.update({
    where: { id: wishlistGiftId },
    data: {
      ...(wishlistGift.isGroupGift
        ? { groupGiftParts: String(contributed) }
        : {}),
      isFullyPaid: price > 0 && contributed >= price,
    },
  });
}

async function confirmBankTransfer(transactionId: string) {
  const transaction = await prismaClient.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    console.error(`  ✗ ${transactionId}: not found`);
    return;
  }

  if (transaction.paymentMethod !== 'BANK_TRANSFER') {
    console.error(
      `  ✗ ${transactionId}: paymentMethod is ${transaction.paymentMethod}, not BANK_TRANSFER — refusing (card payments are confirmed by the dLocal webhook, not this script)`
    );
    return;
  }

  if (transaction.status === 'COMPLETED') {
    console.log(`  · ${transactionId}: already COMPLETED, skipping`);
    return;
  }

  await prismaClient.$transaction([
    prismaClient.transaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED' },
    }),
    prismaClient.transactionStatusLog.create({
      data: {
        transactionId,
        previousStatus: transaction.status,
        status: 'COMPLETED',
        changedById: null,
      },
    }),
  ]);

  await recomputeWishlistGiftProgress(transaction.wishlistGiftId);

  console.log(
    `  ✓ ${transactionId}: ${transaction.payerName ?? 'unknown payer'}, Gs. ${Number(transaction.amount).toLocaleString('es-PY')} → COMPLETED`
  );
}

async function main() {
  const transactionIds = process.argv.slice(2);

  if (transactionIds.length === 0) {
    console.error('Usage: yarn confirm-bank-transfer <transactionId> [transactionId...]');
    process.exit(1);
  }

  for (const transactionId of transactionIds) {
    await confirmBankTransfer(transactionId);
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
