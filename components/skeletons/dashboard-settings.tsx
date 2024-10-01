import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSettingsSkeleton() {
  return (
    <div className="w-full h-screen flex justify-center items-center px-10 flex-col gap-6">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <Skeleton className="h-6 max-w-4xl rounded-lg " />
      </div>
      <div className="w-full flex flex-col gap-8">
        <div className="flex gap-4 max-w-sm">
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
        </div>

        <div className="max-w-sm">
          <Skeleton className="h-4 w-[200px] rounded-lg" />
          <Skeleton className="h-10 w-full mt-2 rounded-lg" />
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
    </div>
  );
}
