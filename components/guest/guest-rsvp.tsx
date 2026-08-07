'use client'

import type { GuestStatus } from '@prisma/client'
import debounce from 'lodash.debounce'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { IoCheckmarkCircle, IoCloseCircle, IoPeopleOutline } from 'react-icons/io5'
import { updateGuestStatus } from '@/actions/data/guest'
import { getGuestForEvent, searchGuestsByName } from '@/actions/data/public-guest'
import EmptyState from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPublicEventUrl } from '@/lib/event-domain'

type GuestSearchResult = {
  id: string
  name: string
  status: GuestStatus
  maskedPhone: string
}

type SelectedGuest = {
  id: string
  name: string
  status: GuestStatus
}

type GuestRsvpProps = {
  eventId: string
  eventSlug: string
  guestId?: string
}

function ConfirmationDone({
  status,
  backHref,
}: {
  status: GuestStatus
  backHref: string
}) {
  if (status === 'CONFIRMED') {
    return (
      <EmptyState
        icon={<IoCheckmarkCircle className="text-6xl text-success" />}
        title="¡Gracias por confirmar!"
        description="Ya avisamos a los organizadores que vas a acompañarlos. 🎉"
        action={
          <Button variant="success" asChild>
            <Link href={backHref}>Volver al sitio</Link>
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      icon={<IoCloseCircle className="text-6xl text-error" />}
      title="Gracias por avisarnos"
      description="Marcamos que no podrás acompañarlos."
      action={
        <Button variant="success" asChild>
          <Link href={backHref}>Volver al sitio</Link>
        </Button>
      }
    />
  )
}

function RsvpActions({
  guest,
  backHref,
  onUpdated,
}: {
  guest: SelectedGuest
  backHref: string
  onUpdated: (status: GuestStatus) => void
}) {
  const [loading, setLoading] = useState<GuestStatus | null>(null)

  const handleRespond = async (status: GuestStatus) => {
    setLoading(status)

    const response = await updateGuestStatus({ guestId: guest.id, status })

    setLoading(null)

    if (!response.error) {
      onUpdated(status)
    }
  }

  if (guest.status !== 'PENDING') {
    return <ConfirmationDone status={guest.status} backHref={backHref} />
  }

  return (
    <EmptyState
      icon={<IoPeopleOutline className="text-6xl text-wedinMain" />}
      title={`Hola ${guest.name}`}
      description="¿Podrás acompañarnos?"
      action={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="success"
            className="gap-2"
            disabled={loading !== null}
            onClick={() => handleRespond('CONFIRMED')}
          >
            Sí, confirmo
            {loading === 'CONFIRMED' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={loading !== null}
            onClick={() => handleRespond('DECLINED')}
          >
            No podré ir
            {loading === 'DECLINED' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </Button>
        </div>
      }
    />
  )
}

export default function GuestRsvp({
  eventId,
  eventSlug,
  guestId,
}: GuestRsvpProps) {
  const backHref = getPublicEventUrl(eventSlug)

  const [selectedGuest, setSelectedGuest] = useState<SelectedGuest | null>(
    null
  )
  const [loadingGuest, setLoadingGuest] = useState(Boolean(guestId))
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GuestSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!guestId) return

    let isMounted = true

    getGuestForEvent(eventId, guestId).then(guest => {
      if (!isMounted) return

      setSelectedGuest(guest)
      setNotFound(!guest)
      setLoadingGuest(false)
    })

    return () => {
      isMounted = false
    }
  }, [eventId, guestId])

  const debouncedSearch = useRef(
    debounce(async (value: string) => {
      if (value.trim().length < 2) {
        setResults([])
        setSearching(false)
        return
      }

      const guests = await searchGuestsByName(eventId, value)
      setResults(guests)
      setSearching(false)
    }, 350)
  ).current

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setSearching(true)
    debouncedSearch(value)
  }

  if (loadingGuest) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-textTertiary" />
      </div>
    )
  }

  if (guestId && notFound) {
    return (
      <EmptyState
        icon={<IoCloseCircle className="text-6xl text-gray-400" />}
        title="No encontramos tu invitación"
        description="Verificá el link que recibiste."
        action={
          <Button variant="success" asChild>
            <Link href={backHref}>Volver al sitio</Link>
          </Button>
        }
      />
    )
  }

  if (selectedGuest) {
    return (
      <RsvpActions
        guest={selectedGuest}
        backHref={backHref}
        onUpdated={status =>
          setSelectedGuest(current =>
            current ? { ...current, status } : current
          )
        }
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 mx-auto max-w-sm">
      <div className="flex flex-col gap-2 items-center">
        <IoPeopleOutline className="text-6xl" />
        <h1 className="max-w-sm text-2xl font-medium text-center text-black">
          Confirmá tu asistencia
        </h1>
        <p className="max-w-sm text-center text-base text-textTertiary">
          Buscá tu nombre en la lista de invitados
        </p>
      </div>

      <Input
        type="text"
        placeholder="Escribí tu nombre"
        value={search}
        onChange={event => handleSearchChange(event.target.value)}
      />

      {searching && (
        <p className="text-center text-sm text-textTertiary">Buscando...</p>
      )}

      {!searching && search.trim().length >= 2 && results.length === 0 && (
        <p className="text-center text-sm text-textTertiary">
          No encontramos invitados con ese nombre
        </p>
      )}

      {results.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          {results.map(guest => (
            <button
              key={guest.id}
              type="button"
              className="flex items-center justify-between rounded-md px-4 py-3 text-left transition-colors hover:bg-gray-50"
              onClick={() =>
                setSelectedGuest({
                  id: guest.id,
                  name: guest.name,
                  status: guest.status,
                })
              }
            >
              <span className="font-medium">{guest.name}</span>
              <span className="text-sm text-textTertiary">
                {guest.maskedPhone}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
