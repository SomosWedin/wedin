import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardEventDetailsSkeleton() {
  return (
    <section className="w-full h-full flex justify-start items-center flex-col sm:gap-8 gap-12">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <Skeleton className="h-8 w-[150px] rounded-lg" />
        <Skeleton className="h-6 w-full max-w-xl rounded-lg" />
      </div>

      <div className="w-full flex flex-col gap-8">
        <div className="w-full flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200 pb-10">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <Skeleton className="h-6 w-[100px] rounded-lg" />
            <Skeleton className="h-4 w-full max-w-md rounded-lg" />
          </div>

          <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
            <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
              <Skeleton className="w-16 h-24 rounded-md" />
              <Skeleton className="w-16 h-24 rounded-md" />
              <Skeleton className="w-16 h-24 rounded-md" />
              <Skeleton className="w-16 h-24 rounded-md" />
              <Skeleton className="w-16 h-24 rounded-md" />
              <Skeleton className="w-16 h-24 rounded-md" />
            </div>

            <Skeleton className="h-10 w-[150px] rounded-lg" />
          </div>
        </div>

        <div className="w-full flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 flex flex-col gap-2">
            <Skeleton className="h-6 w-[200px] rounded-lg" />
            <Skeleton className="h-4 w-full max-w-md rounded-lg" />
          </div>

          <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
            <Skeleton className="h-32 w-full max-w-sm rounded-lg" />

            <div className="flex gap-2">
              <Skeleton className="h-10 w-[100px] rounded-lg" />
              <Skeleton className="h-10 w-[100px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
