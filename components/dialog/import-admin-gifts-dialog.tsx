'use client'

import type { Category, EventType } from '@prisma/client'
import { Upload } from 'lucide-react'
import type { GiftlistOption } from '@/actions/data/giftlist'
import GiftImportForm from '@/components/forms/dialog/gift-import'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAdminGiftImport } from '@/hooks/dialog/forms/use-admin-gift-import'

export default function ImportAdminGiftsDialog({
  categories,
  giftlists,
  eventTypes,
}: {
  categories: Category[]
  giftlists: GiftlistOption[]
  eventTypes: EventType[]
}) {
  const controller = useAdminGiftImport()
  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar regalos
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden p-4 sm:p-6"
        onInteractOutside={event => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 pr-5">
          <DialogTitle>Importar regalos</DialogTitle>
          <DialogDescription>
            Subí un archivo, relacioná sus campos y revisá los regalos antes de
            crearlos.
          </DialogDescription>
        </DialogHeader>
        <GiftImportForm
          controller={controller}
          catalog={{
            categories,
            eventTypes,
            collections: giftlists.map(giftlist => ({
              ...giftlist,
              giftCount: giftlist.gifts.length,
            })),
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
