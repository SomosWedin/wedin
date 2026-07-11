'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LogoutConfirmDialog from '@/components/dialog/logout-confirm-dialog';
import type { User as CurrentUser } from '@prisma/client';

type UserNavProps = {
  currentUser: CurrentUser;
};

export function UserNav({ currentUser }: UserNavProps) {
  const { name, email } = currentUser;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  {/* <AvatarImage src="#" alt="Avatar" /> */}
                  <AvatarFallback className="bg-transparent">
                    {name ? name[0].toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Perfil</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/dashboard" className="flex items-center">
              <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/billetera" className="flex items-center">
              <User className="w-4 h-4 mr-3 text-muted-foreground" />
              Mi billetera
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {/* <DropdownMenuSeparator /> */}
        {/* <DropdownMenuItem
          className="hover:cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            setShowLogoutConfirm(true);
          }}
        >
          <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
          Cerrar sesión
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
    <LogoutConfirmDialog
      open={showLogoutConfirm}
      onOpenChange={setShowLogoutConfirm}
    />
    </>
  );
}
