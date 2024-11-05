import { Skeleton } from '@/components/ui/skeleton';

export function UserNavSkeleton() {
  return (
    <div className="flex items-center space-x-4 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-6 w-24 rounded" />
    </div>
  );
}
