export function getGiftProgress(price: string, transactions: { amount: string }[]) {
  const priceValue = Number(price) || 0;
  const contributed = transactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );
  const remaining = Math.max(0, priceValue - contributed);
  const percentage =
    priceValue > 0 ? Math.min(100, Math.round((contributed / priceValue) * 100)) : 0;

  return { priceValue, contributed, remaining, percentage };
}
