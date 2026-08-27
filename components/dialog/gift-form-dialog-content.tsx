'use client'

import type { Category } from '@prisma/client'
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
  uploadInputId: string
  submitLabel: string
  minQuantity?: number
  lockPrice?: boolean
  allowTypeChange?: boolean
  adminMode?: boolean
}

export default function GiftFormDialogContent({
  title,
  controller,
  categories,
  uploadInputId,
  submitLabel,
  minQuantity,
  lockPrice,
  allowTypeChange,
  adminMode,
}: GiftFormDialogContentProps) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <GiftForm
        form={controller.form}
        categories={categories}
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
        onFileChange={controller.handleFileChange}
        onSubmit={controller.handleSubmit}
        onCancel={() => controller.handleOpenChange(false)}
      />
    </DialogContent>
  )
}
