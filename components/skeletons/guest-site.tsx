import { Skeleton } from '@/components/ui/skeleton'

const GIFT_CARD_SLOTS = Array.from(
  { length: 6 },
  (_, index) => `gift-card-${index}`
)

// Mirrors guest-hero.tsx and guest-gift-catalog.tsx so the page doesn't jump
// when the real content replaces it. Keep the wrappers in sync with them.
export default function GuestSiteSkeleton() {
  return (
    <>
      <div className="bg-gray-50">
        <section className="grid grid-cols-1 gap-0 lg:gap-4 items-center mx-auto max-w-7xl lg:grid-cols-2">
          <div className="w-full aspect-[1/1] px-0 sm:px-4 py-0 sm:py-8">
            <Skeleton className="w-full h-full rounded-none sm:rounded-2xl" />
          </div>

          <div className="flex flex-col gap-4 sm:gap-8 px-4 py-6 lg:py-0">
            <Skeleton className="w-64 h-6 max-w-full rounded-full" />
            <Skeleton className="w-80 h-12 max-w-full rounded-lg sm:h-14" />

            <div className="flex flex-col gap-2">
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-2/3 h-4 rounded" />
            </div>

            <Skeleton className="mt-4 w-40 h-11 rounded-md" />
          </div>
        </section>
      </div>

      <section className="px-4 py-8 sm:py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <Skeleton className="mb-6 w-56 h-9 rounded-lg" />

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <Skeleton className="w-24 h-9 rounded-md" />
            <Skeleton className="w-36 h-9 rounded-md" />
            <Skeleton className="w-32 h-9 rounded-md" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="flex-1 h-10 rounded-md" />
            <Skeleton className="w-full h-10 rounded-md sm:w-44" />
            <Skeleton className="w-full h-10 rounded-md sm:w-40" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {GIFT_CARD_SLOTS.map(slot => (
            <div
              key={slot}
              className="flex flex-col gap-3 justify-between p-3 bg-gray-50 rounded-xl"
            >
              <Skeleton className="w-full rounded-lg aspect-square" />
              <div className="flex flex-col gap-2">
                <Skeleton className="w-3/4 h-4 rounded" />
                <Skeleton className="w-1/2 h-5 rounded" />
              </div>
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
