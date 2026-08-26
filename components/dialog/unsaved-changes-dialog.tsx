'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type UnsavedChangesDialogProps = {
  hasUnsavedChanges: boolean
}

export default function UnsavedChangesDialog({
  hasUnsavedChanges,
}: UnsavedChangesDialogProps) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a')

      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      const href = anchor.getAttribute('href')

      if (!href || href.startsWith('#')) return

      const destination = new URL(anchor.href, window.location.href)

      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setPendingHref(destination.pathname + destination.search)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [hasUnsavedChanges])

  return (
    <AlertDialog
      open={pendingHref !== null}
      onOpenChange={open => {
        if (!open) setPendingHref(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir sin guardar los cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Si salís de esta pantalla vas a perder los cambios que todavía no
            guardaste.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir editando</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingHref) router.push(pendingHref)
            }}
            className="bg-destructive text-white hover:bg-destructive/85 transition-colors"
          >
            Sí, salir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
