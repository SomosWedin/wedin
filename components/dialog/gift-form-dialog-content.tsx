'use client'

import type { Category, EventType } from '@prisma/client'
import type { GiftlistOption } from '@/actions/data/giftlist'
import GiftForm from '@/components/forms/dialog/gift'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GiftFormController } from '@/hooks/dialog/forms/use-gift-form-controller'

type GiftFormDialogContentProps = {
  title: string
  controller: GiftFormController
  categories: Category[]
  eventTypes?: EventType[]
  giftlists?: GiftlistOption[]
  uploadInputId: string
  submitLabel: string
  minQuantity?: number
  lockPrice?: boolean
  allowTypeChange?: boolean
  adminMode?: boolean
  readOnlyReason?: string
}

export default function GiftFormDialogContent({
  title,
  controller,
  categories,
  eventTypes,
  giftlists,
  uploadInputId,
  submitLabel,
  minQuantity,
  lockPrice,
  allowTypeChange,
  adminMode,
  readOnlyReason,
}: GiftFormDialogContentProps) {
  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <GiftForm
        form={controller.form}
        categories={categories}
        eventTypes={eventTypes}
        giftlists={giftlists}
        loading={controller.loading}
        isValid={controller.isValid}
        imagePreview={controller.imagePreview}
        preparingImage={controller.preparingImage}
        fileInputRef={controller.fileInputRef}
        uploadInputId={uploadInputId}
        submitLabel={submitLabel}
        minQuantity={minQuantity}
        lockPrice={lockPrice}
        allowTypeChange={allowTypeChange}
        adminMode={adminMode}
        readOnlyReason={readOnlyReason}
        onFileChange={controller.handleFileChange}
        onSubmit={controller.handleSubmit}
        onCancel={() => controller.handleOpenChange(false)}
      />
    </DialogContent>
  )
}
