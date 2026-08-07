import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardGuestsSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Skeleton className="w-full h-24 rounded-lg" />

      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
