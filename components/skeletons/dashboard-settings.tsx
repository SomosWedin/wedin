import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSettingsSkeleton() {
  return (
    <div className="w-full h-full flex flex-col justify-start gap-8">
      <div className="flex gap-2">
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
        <div className="w-full">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-10 w-64" />
    </div>
  );
}
