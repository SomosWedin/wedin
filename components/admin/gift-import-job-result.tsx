type GiftImportResultRow = {
  status: string
  giftId: string | null
  excluded: boolean
  error: string | null
  review: unknown
}

function savedReview(review: unknown) {
  if (!review || typeof review !== 'object')
    return { existingGiftId: null, errors: [] as string[] }

  const value = review as { existingGiftId?: unknown; errors?: unknown }
  return {
    existingGiftId:
      typeof value.existingGiftId === 'string' &&
      /^[a-f\d]{24}$/i.test(value.existingGiftId)
        ? value.existingGiftId
        : null,
    errors: Array.isArray(value.errors)
      ? value.errors.filter(
          (error): error is string => typeof error === 'string'
        )
      : [],
  }
}

export default function GiftImportJobResult({
  row,
  onGift,
}: {
  row: GiftImportResultRow
  onGift: (giftId: string, trigger: HTMLButtonElement) => void
}) {
  const review = savedReview(row.review)
  const giftId = row.giftId || review.existingGiftId
  const reviewErrors = row.excluded
    ? review.errors.filter(error => error !== row.error)
    : []

  return (
    <div className="space-y-1">
      {row.error && <p>{row.error}</p>}
      {reviewErrors.map(error => (
        <p key={error} className="text-xs text-red-700">
          {error}
        </p>
      ))}
      {giftId && (
        <button
          type="button"
          className="underline"
          onClick={event => onGift(giftId, event.currentTarget)}
        >
          {row.status === 'CREATED'
            ? 'Ver regalo creado'
            : 'Ver regalo existente'}
        </button>
      )}
    </div>
  )
}
