'use client'

import type { Guest } from '@prisma/client'
import { useState } from 'react'
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoLinkOutline,
  IoPeopleOutline,
  IoSearchOutline,
  IoTimeOutline,
} from 'react-icons/io5'
import DeleteGuestDialog from '@/components/dialog/delete-guest-dialog'
import {
  ESTADO_BY_GUEST_STATUS,
  GUEST_ESTADO_OPTIONS,
} from '@/components/dashboard/guest-estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuest } from '@/hooks/dashboard/use-guest'
import { useToast } from '@/hooks/use-toast'
import { getPublicEventUrl } from '@/lib/event-domain'

type DashboardGuestsListProps = {
  guests: Guest[]
  eventUrl: string | null
}

export default function DashboardGuestsList({
  guests,
  eventUrl,
}: DashboardGuestsListProps) {
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  const { setGuestStatus } = useGuest()
  const { toast } = useToast()

  const handleCopyIndividualLink = async (guestId: string) => {
    if (!eventUrl) return

    try {
      const link = `${getPublicEventUrl(eventUrl, '/invitados')}?g=${guestId}`
      await navigator.clipboard.writeText(link)

      toast({ title: 'Link individual copiado 🔗' })
    } catch (error) {
      toast({
        title: 'No pudimos copiar el enlace',
        variant: 'destructive',
      })
    }
  }

  const confirmedCount = guests.filter(
    guest => guest.status === 'CONFIRMED'
  ).length
  const pendingCount = guests.filter(guest => guest.status === 'PENDING').length
  const declinedCount = guests.filter(
    guest => guest.status === 'DECLINED'
  ).length

  const filteredGuests = guests.filter(guest => {
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch || guest.name.toLowerCase().includes(normalizedSearch)
    const matchesEstado = !estadoFilter || guest.status === estadoFilter

    return matchesSearch && matchesEstado
  })

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 max-h-[unset] sm:max-h-24">
        <div className="flex gap-3 items-center p-4 w-full">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoPeopleOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{guests.length}</span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Invitados totales
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 w-full">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoCheckmarkCircleOutline className="text-xl text-success" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{confirmedCount}</span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Confirmados
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 w-full">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoTimeOutline className="text-xl text-textTertiary" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{pendingCount}</span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Pendientes
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 w-full">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoCloseCircleOutline className="text-xl text-error" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{declinedCount}</span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Cancelados
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Estado: Todos</option>
          {GUEST_ESTADO_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-4">Nombre</div>
          <div className="col-span-3">Teléfono</div>
          <div className="col-span-3">Estado</div>
          <div className="col-span-2" />
        </div>

        {filteredGuests.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron invitados
          </div>
        )}

        {filteredGuests.map(guest => {
          const estado = ESTADO_BY_GUEST_STATUS[guest.status]

          return (
            <div
              key={guest.id}
              className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center gap-2 sm:contents">
                <div className="col-span-4 font-medium">{guest.name}</div>
                <div className="col-span-3 text-textTertiary text-sm">
                  {guest.phone}
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 sm:contents">
                <div className="col-span-3">
                  <Select
                    value={guest.status}
                    onValueChange={value =>
                      setGuestStatus({
                        guestId: guest.id,
                        status: value as Guest['status'],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px] border-none bg-transparent px-2 focus:ring-0">
                      <SelectValue asChild>
                        <Badge className={estado.className}>
                          {estado.icon}
                          {estado.label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {GUEST_ESTADO_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex col-span-2 gap-2 justify-start sm:justify-end">
                  {eventUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Copiar link individual"
                      onClick={() => handleCopyIndividualLink(guest.id)}
                    >
                      <IoLinkOutline />
                    </Button>
                  )}
                  <DeleteGuestDialog guestId={guest.id} guestName={guest.name} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
