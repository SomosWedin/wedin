import { Skeleton } from '@/components/ui/skeleton'

const FIELD_LABELS = [
  'Nombre y apellido',
  'Email',
  'Cédula de identidad',
  'Teléfono',
]
const CART_ITEM_SLOTS = Array.from(
  { length: 2 },
  (_, index) => `cart-item-${index}`
)
const PAYMENT_METHOD_SLOTS = Array.from(
  { length: 2 },
  (_, index) => `payment-method-${index}`
)

export default function CheckoutSkeleton() {
  return (
    <div className="px-4 py-6 sm:py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="flex justify-center mb-4 sm:mb-8">
        <Skeleton className="w-72 h-8 max-w-full rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-8 mx-auto max-w-3xl md:grid-cols-2">
        <div className="order-2 flex flex-col gap-4 md:order-1">
          <Skeleton className="w-24 h-6 rounded" />

          {FIELD_LABELS.map(label => (
            <div key={label} className="flex flex-col gap-2">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
          ))}

          <div className="flex gap-2 items-center">
            <Skeleton className="w-4 h-4 rounded-sm shrink-0" />
            <Skeleton className="w-56 h-4 max-w-full rounded" />
          </div>
        </div>

        <div className="order-1 flex flex-col gap-6 md:order-2">
          <div>
            <Skeleton className="mb-4 w-24 h-6 rounded" />
            <div className="divide-y divide-gray-100">
              {CART_ITEM_SLOTS.map(slot => (
                <div key={slot} className="flex gap-3 items-center py-3">
                  <Skeleton className="w-12 h-12 rounded-md shrink-0" />
                  <Skeleton className="flex-1 h-4 rounded" />
                  <Skeleton className="w-16 h-4 rounded" />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-16 h-4 rounded" />
            </div>
            <div className="flex justify-between items-center pt-4 mt-2 border-t">
              <Skeleton className="w-16 h-5 rounded" />
              <Skeleton className="w-24 h-6 rounded" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="w-28 h-4 rounded" />
            {PAYMENT_METHOD_SLOTS.map(slot => (
              <div key={slot} className="flex gap-2 items-start">
                <Skeleton className="mt-1 w-4 h-4 rounded-full shrink-0" />
                <div className="flex flex-col flex-1 gap-1.5">
                  <Skeleton className="w-40 h-4 rounded" />
                  <Skeleton className="w-56 h-3.5 max-w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="mt-6 h-11 rounded-md order-3 md:col-span-2" />
      </div>
    </div>
  )
}
