'use client'

import { useState } from 'react'
import { IoQrCodeOutline } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type DownloadQrButtonProps = {
  url: string
  fileName: string
}

export default function DownloadQrButton({
  url,
  fileName,
}: DownloadQrButtonProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)

    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${fileName}.png`
      link.click()

      toast({ title: 'QR descargado 🎉' })
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast({
        title: 'No pudimos generar el QR',
        description: 'Volvé a intentarlo en unos minutos.',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      onClick={handleDownload}
      disabled={loading}
    >
      <span className="sm:hidden">QR</span>

      <span className="hidden sm:inline">Descargar QR</span>

      <IoQrCodeOutline className="text-lg" />
    </Button>
  )
}
