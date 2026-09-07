'use client'

import { Gift, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getExistingImportGift } from '@/actions/data/gift-import'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Result = Awaited<ReturnType<typeof getExistingImportGift>>

export default function ExistingImportGiftDialog({
  giftId,
  onClose,
  restoreFocus,
}: {
  giftId: string | null
  onClose: () => void
  restoreFocus: () => void
}) {
  const [loaded, setLoaded] = useState<{
    id: string
    attempt: number
    result: Result
  } | null>(null)
  const [retry, setRetry] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setLoaded(null)
    setImageFailed(false)
    if (!giftId) return
    let cancelled = false
    void getExistingImportGift(giftId)
      .catch(
        () =>
          ({
            error: 'No se pudo cargar el regalo. Intentá nuevamente.',
          }) as const
      )
      .then(result => {
        if (!cancelled) setLoaded({ id: giftId, attempt: retry, result })
      })
    return () => {
      cancelled = true
    }
  }, [giftId, retry])

  const result =
    loaded?.id === giftId && loaded?.attempt === retry ? loaded.result : null
  const gift = result?.gift

  return (
    <Dialog
      open={Boolean(giftId)}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto"
        onCloseAutoFocus={event => {
          event.preventDefault()
          restoreFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Regalo existente en Wedin</DialogTitle>
          <DialogDescription>
            Estos son los datos guardados en el catálogo.
          </DialogDescription>
        </DialogHeader>
        {!result ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 py-8 text-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando regalo…
          </div>
        ) : result.error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700">
              {result.error}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetry(value => value + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : gift ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border bg-gray-50 p-4">
              {gift.image?.url &&
              /^https?:\/\//i.test(gift.image.url) &&
              !imageFailed ? (
                <Image
                  src={gift.image.url}
                  alt={gift.name}
                  width={240}
                  height={180}
                  unoptimized
                  className="h-44 w-full object-contain"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-textTertiary">
                  <Gift className="h-8 w-8" aria-hidden="true" />
                  <span className="text-sm">Sin imagen disponible</span>
                </div>
              )}
            </div>
            <dl className="space-y-4 text-sm">
              {[
                ['Nombre', gift.name],
                ['Precio', `Gs. ${Number(gift.price).toLocaleString('es-PY')}`],
                ['Categoría', gift.category.name],
                [
                  'Colecciones',
                  gift.giftlists.map(item => item.name).join(', ') ||
                    'Sin colección',
                ],
                [
                  'Tipos de evento',
                  gift.category.eventTypes.map(item => item.name).join(', ') ||
                    'Sin tipos de evento',
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium text-textTertiary">{label}</dt>
                  <dd className="mt-1 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
