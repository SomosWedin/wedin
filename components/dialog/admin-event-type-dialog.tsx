'use client'

import type { EventType } from '@prisma/client'
import { IoAdd, IoPencilOutline } from 'react-icons/io5'
import EventTypeForm from '@/components/forms/dialog/event-type'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateAdminEventType } from '@/hooks/dialog/forms/use-create-admin-event-type'
import { useEditAdminEventType } from '@/hooks/dialog/forms/use-edit-admin-event-type'

export default function AdminEventTypeDialog({
  eventType,
}: {
  eventType?: EventType
}) {
  return eventType ? (
    <EditEventTypeDialog eventType={eventType} />
  ) : (
    <CreateEventTypeDialog />
  )
}

function CreateEventTypeDialog() {
  const controller = useCreateAdminEventType()

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="success" className="gap-2">
          Crear tipo de evento
          <IoAdd className="text-2xl" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear tipo de evento</DialogTitle>
        </DialogHeader>
        <EventTypeForm
          form={controller.form}
          loading={controller.loading}
          isValid={controller.isValid}
          onSubmit={controller.handleSubmit}
          onCancel={() => controller.handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function EditEventTypeDialog({ eventType }: { eventType: EventType }) {
  const controller = useEditAdminEventType(eventType)

  return (
    <Dialog open={controller.open} onOpenChange={controller.handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Editar ${eventType.name}`}
          title="Editar tipo de evento"
        >
          <IoPencilOutline />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tipo de evento</DialogTitle>
        </DialogHeader>
        <EventTypeForm
          form={controller.form}
          loading={controller.loading}
          isValid={controller.isValid}
          submitLabel="Guardar cambios"
          onSubmit={controller.handleSubmit}
          onCancel={() => controller.handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
