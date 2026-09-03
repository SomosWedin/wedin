'use client'

import { useState } from 'react'
import { setEventPublished } from '@/actions/data/event'
import { useToast } from '@/hooks/use-toast'

type UseToggleEventPublishedProps = {
  eventId: string
  isPublished: boolean
  hasAcceptedTerms: boolean
}

export function useToggleEventPublished({
  eventId,
  isPublished: initialIsPublished,
  hasAcceptedTerms: initialHasAcceptedTerms,
}: UseToggleEventPublishedProps) {
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(
    initialHasAcceptedTerms
  )
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

    const wasFirstActivation = next && !hasAcceptedTerms

    if (next) setHasAcceptedTerms(true)

    toast({
      title: wasFirstActivation
        ? 'Tu lista está activa y tu sitio ya es visible para tus invitados. 🎉'
        : next
          ? 'Tu sitio ahora es visible para tus invitados. 👀'
          : 'Tu sitio ya no es visible para tus invitados.',
    })
    setLoading(false)
  }

  return {
    isPublished,
    hasAcceptedTerms,
    loading,
    toggle,
  }
}
