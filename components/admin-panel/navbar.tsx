// import { Suspense } from 'react';
import Image from 'next/image'
import Link from 'next/link'
import { getCurrentUser } from '@/actions/get-current-user'
import { SheetMenu } from '@/components/admin-panel/sheet-menu'
import { UserNav } from '@/components/admin-panel/user-nav'
import wedinLogo from '@/public/assets/w-logo.svg'
import { UserNavSkeleton } from '../skeletons/user-nav-skeleton'

interface NavbarProps {
  title: string
}

export async function Navbar({ title }: NavbarProps) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return <UserNavSkeleton />
  }
  return (
    <header className="sticky top-0 z-10 w-full">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <Link href="/dashboard" className="lg:hidden">
            <Image src={wedinLogo} alt="wedin" width={96} priority />
          </Link>
          <h1 className="hidden">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end">
          {/* <Suspense fallback={<UserNavSkeleton />}> */}
          <UserNav currentUser={currentUser} />
          {/* </Suspense> */}
        </div>
      </div>
    </header>
  )
}
