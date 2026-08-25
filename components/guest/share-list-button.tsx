'use client'

import { IoLinkOutline } from 'react-icons/io5'
import { useIsPreviewMode } from '@/components/guest/preview-mode'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function ShareListButton() {
  const { toast } = useToast()
  const isPreviewMode = useIsPreviewMode()

  const handleShare = async () => {
    if (isPreviewMode) {
      toast({
        title: 'Esto es una vista previa',
        description: 'Compartí el link de tu sitio desde el inicio.',
      })
      return
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Enlace copiado al portapapeles 🔗' })
    } catch (_error) {
      toast({
        title: 'No pudimos copiar el enlace',
        description: 'Copiá la dirección desde la barra del navegador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handleShare} size="sm">
      Compartir lista
      <IoLinkOutline className="text-lg" />
    </Button>
  )
}
