'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useState } from 'react'
import logout from '@/actions/auth/logout'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LogoutConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function LogoutConfirmDialog({
  open,
  onOpenChange,
}: LogoutConfirmDialogProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleConfirm = async () => {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <DialogPrimitive.Title className="text-lg font-semibold">
              ¿Estás seguro de que quieres cerrar sesión?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Asegúrate de que has guardado todo antes de cerrar sesión.
            </DialogPrimitive.Description>
          </div>
          <div className="flex flex-row justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            <DialogPrimitive.Close
              disabled={isLoggingOut}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Cancelar
            </DialogPrimitive.Close>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleConfirm}
              className={cn(
                buttonVariants(),
                'bg-destructive text-white hover:bg-destructive/85 transition-colors'
              )}
            >
              Si, cerrar sesión
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
