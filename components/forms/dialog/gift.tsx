'use client'

import type { Category, EventType } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
  type BaseSyntheticEvent,
  type ChangeEventHandler,
  type RefObject,
  useId,
  useMemo,
  useState,
} from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { CiImageOn } from 'react-icons/ci'
import { IoInformationCircleOutline } from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'
import type { GiftlistOption } from '@/actions/data/giftlist'
import GiftlistMultiSelect from '@/components/forms/common/giftlist-multi-select'
import PriceInput from '@/components/forms/common/price-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getGiftlistOptionIds,
  retainCategoryCompatibleGiftlistIds,
} from '@/lib/gift-collection-options'
import {
  ALLOWED_IMAGE_FORMATS_LABEL,
  IMAGE_UPLOAD_ACCEPT,
  MAX_IMAGE_SIZE_MB,
} from '@/lib/image-upload'
import type { GiftFormValues } from '@/schemas/form'

export type GiftFormProps = {
  form: UseFormReturn<GiftFormValues>
  categories: Category[]
  eventTypes?: EventType[]
  giftlists?: GiftlistOption[]
  loading: boolean
  isValid: boolean
  imagePreview: string | null
  preparingImage?: boolean
  fileInputRef: RefObject<HTMLInputElement>
  uploadInputId: string
  submitLabel: string
  minQuantity?: number
  lockPrice?: boolean
  allowTypeChange?: boolean
  adminMode?: boolean
  readOnlyReason?: string
  onFileChange: ChangeEventHandler<HTMLInputElement>
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
  onCancel: () => void
}

export default function GiftForm({
  form,
  categories,
  eventTypes = [],
  giftlists = [],
  loading,
  isValid,
  imagePreview,
  preparingImage = false,
  fileInputRef,
  uploadInputId,
  submitLabel,
  minQuantity = 1,
  lockPrice = false,
  allowTypeChange = false,
  adminMode = false,
  readOnlyReason,
  onFileChange,
  onSubmit,
  onCancel,
}: GiftFormProps) {
  const eventTypeInputId = useId()
  const isGroupGift = form.watch('isGroupGift')
  const selectedGiftlistIds = form.watch('giftlistIds')
  const selectedCategoryId = form.watch('categoryId')
  const initialEventTypeId = categories.find(
    category => category.id === selectedCategoryId
  )?.eventTypeIds[0]
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    initialEventTypeId ?? ''
  )
  const canChooseEventType = adminMode && allowTypeChange
  const availableCategories = useMemo(() => {
    if (canChooseEventType) {
      if (!selectedEventTypeId) return []
      return categories.filter(category =>
        category.eventTypeIds.includes(selectedEventTypeId)
      )
    }
    return categories
  }, [categories, canChooseEventType, selectedEventTypeId])
  const selectedCategory = categories.find(
    category => category.id === selectedCategoryId
  )
  const availableGiftlistIds = useMemo(() => {
    return getGiftlistOptionIds(
      giftlists,
      selectedCategory,
      selectedEventTypeId
    )
  }, [giftlists, selectedCategory, selectedEventTypeId])

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {readOnlyReason && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-textPrimary"
          >
            <IoInformationCircleOutline className="mt-0.5 shrink-0 text-lg text-warning" />
            <p>{readOnlyReason}</p>
          </div>
        )}

        <fieldset
          disabled={Boolean(readOnlyReason)}
          aria-disabled={Boolean(readOnlyReason)}
          className="contents"
        >
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Imagen del producto</span>

            <div className="flex items-center gap-4 rounded-lg border border-dashed border-borderSecondary p-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-gray-50">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Vista previa del regalo"
                    className="h-full w-full object-cover"
                    width={80}
                    height={80}
                  />
                ) : (
                  <CiImageOn className="text-3xl text-gray-400" />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <input
                  id={uploadInputId}
                  type="file"
                  className="hidden"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  ref={fileInputRef}
                  onChange={onFileChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={preparingImage}
                >
                  {preparingImage ? 'Procesando…' : 'Subir imagen'}
                  {preparingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MdOutlineFileUpload className="text-lg" />
                  )}
                </Button>

                <p className="text-xs text-textTertiary">
                  Se recomienda 1080 x 1080 (1:1), hasta {MAX_IMAGE_SIZE_MB} MB,
                  en {ALLOWED_IMAGE_FORMATS_LABEL}
                </p>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>

                <FormControl>
                  <Input {...field} placeholder="Sofá living" />
                </FormControl>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          {adminMode && (
            <div className="flex flex-col gap-1">
              <label htmlFor={eventTypeInputId} className="text-sm font-medium">
                Tipo de evento
              </label>
              <Select
                value={selectedEventTypeId}
                onValueChange={value => {
                  setSelectedEventTypeId(value)
                  if (
                    selectedCategoryId &&
                    !categories
                      .find(category => category.id === selectedCategoryId)
                      ?.eventTypeIds.includes(value)
                  ) {
                    form.setValue('categoryId', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    form.setValue('giftlistIds', [], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                }}
              >
                <SelectTrigger id={eventTypeInputId}>
                  <SelectValue placeholder="Elegí un tipo de evento" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {eventTypes.map(eventType => (
                    <SelectItem key={eventType.id} value={eventType.id}>
                      {eventType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>

                <Select
                  value={field.value}
                  onValueChange={value => {
                    if (adminMode && value !== field.value) {
                      const nextCategory = categories.find(
                        category => category.id === value
                      )
                      const compatibleIds = retainCategoryCompatibleGiftlistIds(
                        selectedGiftlistIds,
                        giftlists,
                        nextCategory
                      )
                      form.setValue('giftlistIds', compatibleIds, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }

                    field.onChange(value)
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una categoría" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent className="bg-white">
                    {availableCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          {adminMode && (
            <FormField
              control={form.control}
              name="giftlistIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colecciones (opcional)</FormLabel>
                  <GiftlistMultiSelect
                    giftlists={giftlists}
                    availableIds={availableGiftlistIds}
                    selectedIds={field.value}
                    onChange={field.onChange}
                    disabled={!selectedCategory || !selectedEventTypeId}
                  />
                  {giftlists.length === 0 && (
                    <p className="text-xs text-textTertiary">
                      No hay colecciones creadas. Podés crear una desde la
                      pestaña Colecciones.
                    </p>
                  )}
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          )}

          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="flex-[8]">
                  <FormLabel className="flex items-center h-5">
                    Precio
                  </FormLabel>

                  {lockPrice ? (
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div>
                            <FormControl>
                              <PriceInput
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                disabled
                              />
                            </FormControl>
                          </div>
                        </TooltipTrigger>

                        <TooltipContent side="top">
                          No podés cambiar el precio de un regalo recibido
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <FormControl>
                      <PriceInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                  )}

                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            {!isGroupGift && !adminMode && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="flex-[2]">
                    <div className="flex h-5 items-center gap-1">
                      <FormLabel>Cantidad</FormLabel>

                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Información sobre la cantidad"
                              className="inline-flex"
                            >
                              <IoInformationCircleOutline
                                aria-hidden="true"
                                className="text-textTertiary"
                              />
                            </button>
                          </TooltipTrigger>

                          <TooltipContent side="top">
                            Cuántas unidades de este regalo pueden comprar tus
                            invitados
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <FormControl>
                      <Input
                        type="number"
                        min={minQuantity}
                        max={20}
                        step={1}
                        value={field.value}
                        onChange={event => {
                          if (event.target.value.length > 2) return
                          field.onChange(event.target.value)
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>

                    <FormMessage className="font-normal text-red-600" />
                  </FormItem>
                )}
              />
            )}
          </div>

          {!adminMode && (
            <FormField
              control={form.control}
              name="isFavoriteGift"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <FormLabel>El que más queremos ⭐</FormLabel>

                    <p className="text-sm text-textTertiary">
                      Destacá este regalo para tus invitados
                    </p>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {allowTypeChange && !adminMode && (
            <FormField
              control={form.control}
              name="isGroupGift"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Regalo grupal</FormLabel>

                    <p className="text-sm text-textTertiary">
                      Permite que varios invitados contribuyan a este regalo
                    </p>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </fieldset>

        <div className="-mx-6 -mb-6 flex justify-end gap-2 rounded-b-lg bg-gray-50 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="success"
            className="gap-2"
            disabled={loading || !isValid || Boolean(readOnlyReason)}
          >
            {submitLabel}

            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </form>
    </Form>
  )
}
