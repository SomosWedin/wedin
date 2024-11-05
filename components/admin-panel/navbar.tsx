// import { Suspense } from 'react';
import { UserNav } from '@/components/admin-panel/user-nav';
import { SheetMenu } from '@/components/admin-panel/sheet-menu';
import { getCurrentUser } from '@/actions/get-current-user';
import { UserNavSkeleton } from '../skeletons/user-nav-skeleton';

interface NavbarProps {
  title: string;
}

export async function Navbar({ title }: NavbarProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return <UserNavSkeleton />;
  }
  return (
    <header className="sticky top-0 z-10 w-full bg-white/95 shadow backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          {/* <Suspense fallback={<UserNavSkeleton />}> */}
          <UserNav currentUser={currentUser} />
          {/* </Suspense> */}
        </div>
      </div>
    </header>
  );
}
