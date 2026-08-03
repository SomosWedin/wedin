'use client'

import { useState } from 'react'
import { setEventPublished } from '@/actions/data/event'
import { useToast } from '@/hooks/use-toast'

type UseToggleEventPublishedProps = {
  eventId: string
  isPublished: boolean
}

export function useToggleEventPublished({
  eventId,
  isPublished: initialIsPublished,
}: UseToggleEventPublishedProps) {
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const toggle = async (next: boolean) => {
    setLoading(true)
    setIsPublished(next)

    const result = await setEventPublished(eventId, next)

    if ('error' in result) {
      setIsPublished(!next)
      toast({ title: result.error, variant: 'destructive' })
      setLoading(false)
      return
    }

    toast({
      title: next
        ? 'Tu sitio ahora es visible para tus invitados. 👀'
        : 'Tu sitio ya no es visible para tus invitados.',
    })
    setLoading(false)
  }

  return {
    isPublished,
    loading,
    toggle,
  }
}
