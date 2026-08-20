'use client'

import { Loader2, Monitor, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IoEyeOutline } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  isSitePreviewReadyMessage,
  SITE_PREVIEW_DRAFT,
  SITE_PREVIEW_PATH,
  type SitePreviewDraft,
  type SitePreviewImage,
} from '@/lib/site-preview'

type EventCoverPreviewDialogProps = {
  images: SitePreviewImage[]
  coverMessage: string
  hasUnsavedChanges: boolean
}

type DeviceMode = 'mobile' | 'desktop'

const FRAME_WIDTHS: Record<DeviceMode, number> = {
  mobile: 390,
  desktop: 1440,
}

const EventCoverPreviewDialog = ({
  images,
  coverMessage,
  hasUnsavedChanges,
}: EventCoverPreviewDialogProps) => {
  const [open, setOpen] = useState(false)
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [stage, setStage] = useState({ width: 0, height: 0 })
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const draft: SitePreviewDraft = { coverMessage, images }
  const draftSignature = JSON.stringify(draft)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const postDraft = useCallback((payload: SitePreviewDraft) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: SITE_PREVIEW_DRAFT, draft: payload },
      window.location.origin
    )
  }, [])

  useEffect(() => {
    if (!open) return

    const handleMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin) return
      if (!isSitePreviewReadyMessage(message.data)) return

      postDraft(draftRef.current)
    }

    window.addEventListener('message', handleMessage)

    return () => window.removeEventListener('message', handleMessage)
  }, [open, postDraft])

  useEffect(() => {
    if (!open) return

    postDraft(JSON.parse(draftSignature) as SitePreviewDraft)
  }, [open, postDraft, draftSignature])

  const stageRef = useCallback((stageElement: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!stageElement) return

    const measure = (width: number, height: number) =>
      setStage({ width, height })

    measure(stageElement.clientWidth, stageElement.clientHeight)

    const observer = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width, entry.contentRect.height)
    )

    observer.observe(stageElement)
    observerRef.current = observer
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFrameLoaded(false)
    setOpen(nextOpen)
  }

  const handleDeviceChange = (nextDevice: DeviceMode) => {
    if (nextDevice === device) return

    setFrameLoaded(false)
    setDevice(nextDevice)
  }

  const frameWidth = FRAME_WIDTHS[device]
  const scale = stage.width ? Math.min(1, stage.width / frameWidth) : 1
  const frameHeight = scale ? stage.height / scale : stage.height

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          Vista previa
          <IoEyeOutline className="text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-0 p-0 w-[96vw] max-w-[96vw] h-[92vh] overflow-hidden">
        <DialogHeader className="flex flex-row gap-4 justify-between items-center py-3 pr-14 pl-6 space-y-0 border-b border-gray-200">
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:gap-3 sm:items-center">
            <DialogTitle>Así lo verán tus invitados</DialogTitle>
            {hasUnsavedChanges && (
              <span className="py-0.5 px-2 text-xs font-medium text-amber-700 whitespace-nowrap bg-amber-50 rounded-full border border-amber-200">
                Borrador · sin guardar
              </span>
            )}
          </div>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-md shrink-0">
            <button
              type="button"
              aria-label="Ver en celular"
              aria-pressed={device === 'mobile'}
              onClick={() => handleDeviceChange('mobile')}
              className={`flex gap-2 items-center px-3 py-1.5 text-sm rounded transition-colors ${
                device === 'mobile'
                  ? 'bg-white shadow-sm text-textPrimary'
                  : 'text-textTertiary hover:text-textPrimary'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Celular</span>
            </button>
            <button
              type="button"
              aria-label="Ver en computadora"
              aria-pressed={device === 'desktop'}
              onClick={() => handleDeviceChange('desktop')}
              className={`flex gap-2 items-center px-3 py-1.5 text-sm rounded transition-colors ${
                device === 'desktop'
                  ? 'bg-white shadow-sm text-textPrimary'
                  : 'text-textTertiary hover:text-textPrimary'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Computadora</span>
            </button>
          </div>
        </DialogHeader>

        <div className="flex overflow-hidden flex-1 p-4 bg-gray-100 sm:p-6">
          <div
            ref={stageRef}
            className="flex overflow-hidden flex-1 justify-center"
          >
            <div
              className="overflow-hidden relative bg-white rounded-xl border border-gray-200 shadow-sm shrink-0"
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
              }}
            >
              <iframe
                ref={iframeRef}
                key={device}
                src={SITE_PREVIEW_PATH}
                title="Vista previa del sitio"
                className="w-full h-full border-0"
                onLoad={() => setFrameLoaded(true)}
              />

              {!frameLoaded && (
                <div className="flex absolute inset-0 gap-3 justify-center items-center bg-white pointer-events-none text-textTertiary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Cargando tu sitio…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EventCoverPreviewDialog
