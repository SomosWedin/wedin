import Link from 'next/link';
import { MenuIcon, PanelsTopLeft } from 'lucide-react';
import Image from 'next/image';
import wedinIcon from '@/public/assets/w-icon.svg';

import { Button } from '@/components/ui/button';
import { Menu } from '@/components/admin-panel/menu';
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="sm:w-72 px-3 h-full flex flex-col bg-white"
        side="left"
      >
        <SheetHeader>
          <Button
            className="flex justify-center items-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link href="/dashboard" className="flex items-center gap-1">
              <Image src={wedinIcon} alt="wedin icon" width={46} />
              <SheetTitle className="font-bold text-lg text-wedinMain">
                wedin
              </SheetTitle>
            </Link>
          </Button>
        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
