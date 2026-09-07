'use client'

import { Upload } from 'lucide-react'
import CollectionImportForm from '@/components/forms/dialog/collection-import'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAdminCollectionImport } from '@/hooks/dialog/forms/use-admin-collection-import'
import type { CollectionImportGift } from '@/schemas/collection-import'

export default function ImportAdminCollectionsDialog({
  gifts,
}: {
  gifts: CollectionImportGift[]
}) {
  const controller = useAdminCollectionImport()
  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar colecciones
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-6xl flex-col overflow-hidden p-4 sm:p-6"
        onInteractOutside={event => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 pr-5">
          <DialogTitle>Importar colecciones</DialogTitle>
          <DialogDescription>
            Subí un archivo y revisá los regalos que se agregarán, conservarán o
            quitarán.
          </DialogDescription>
        </DialogHeader>
        <CollectionImportForm controller={controller} gifts={gifts} />
      </DialogContent>
    </Dialog>
  )
}
