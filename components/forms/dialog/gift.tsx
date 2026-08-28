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
  onFileChange,
  onSubmit,
  onCancel,
}: GiftFormProps) {
  const eventTypeInputId = useId()
  const isGroupGift = form.watch('isGroupGift')
  const newGiftlistName = form.watch('newGiftlistName')
  const selectedGiftlistId = form.watch('giftlistId')
  const selectedCategoryId = form.watch('categoryId')
  const isCreatingGiftlist = newGiftlistName !== undefined
  const initialEventTypeId = categories.find(
    category => category.id === selectedCategoryId
  )?.eventTypeIds[0]
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(
    initialEventTypeId ?? ''
  )
  const canChooseEventType = adminMode && allowTypeChange
  const availableCategories = useMemo(() => {
    const selectedGiftlist = giftlists.find(
      giftlist => giftlist.id === selectedGiftlistId
    )

    let filteredCategories = categories

    if (canChooseEventType) {
      if (!selectedEventTypeId) return []
      filteredCategories = filteredCategories.filter(category =>
        category.eventTypeIds.includes(selectedEventTypeId)
      )
    }

    if (!selectedGiftlist || selectedGiftlist.eventTypeIds.length === 0) {
      return filteredCategories
    }

    return filteredCategories.filter(category =>
      selectedGiftlist.eventTypeIds.every(eventTypeId =>
        category.eventTypeIds.includes(eventTypeId)
      )
    )
  }, [
    categories,
    canChooseEventType,
    giftlists,
    selectedEventTypeId,
    selectedGiftlistId,
  ])
  const selectedCategory = categories.find(
    category => category.id === selectedCategoryId
  )
  const selectedEventTypeNames = eventTypes
    .filter(eventType => selectedCategory?.eventTypeIds.includes(eventType.id))
    .map(eventType => eventType.name)

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>

              <Select value={field.value} onValueChange={field.onChange}>
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
          <>
            <FormField
              control={form.control}
              name="giftlistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colección (opcional)</FormLabel>

                  <Select
                    value={
                      isCreatingGiftlist
                        ? '__create_giftlist__'
                        : (field.value ?? '__no_giftlist__')
                    }
                    onValueChange={value => {
                      if (value === '__create_giftlist__') {
                        field.onChange(undefined)
                        form.setValue('newGiftlistName', '', {
                          shouldDirty: true,
                          shouldTouch: false,
                          shouldValidate: false,
                        })
                        form.clearErrors('newGiftlistName')
                        return
                      }

                      form.setValue('newGiftlistName', undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                      form.clearErrors('newGiftlistName')
                      const giftlistId =
                        value === '__no_giftlist__' ? undefined : value
                      const selectedGiftlist = giftlists.find(
                        giftlist => giftlist.id === giftlistId
                      )
                      const currentCategory = categories.find(
                        category => category.id === form.getValues('categoryId')
                      )

                      if (
                        selectedGiftlist &&
                        selectedGiftlist.eventTypeIds.length > 0 &&
                        currentCategory &&
                        selectedGiftlist.eventTypeIds.some(
                          eventTypeId =>
                            !currentCategory.eventTypeIds.includes(eventTypeId)
                        )
                      ) {
                        form.setValue('categoryId', '', {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }

                      field.onChange(giftlistId)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí una colección" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent className="bg-white">
                      <SelectItem value="__no_giftlist__">
                        Sin colección
                      </SelectItem>
                      {giftlists.map(giftlist => (
                        <SelectItem key={giftlist.id} value={giftlist.id}>
                          {giftlist.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_giftlist__">
                        + Crear nueva colección
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {giftlists.length === 0 && (
                    <p className="text-xs text-textTertiary">
                      No hay colecciones creadas. Podés crear una nueva o dejar
                      el regalo sin colección.
                    </p>
                  )}

                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />

            {isCreatingGiftlist && (
              <FormField
                control={form.control}
                name="newGiftlistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la nueva colección</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Esenciales para el hogar"
                      />
                    </FormControl>
                    <p className="text-xs text-textTertiary">
                      La colección se creará cuando guardes el regalo.
                    </p>
                    <FormMessage className="font-normal text-red-600" />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="flex-[8]">
                <FormLabel className="flex items-center h-5">Precio</FormLabel>

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
            disabled={loading || !isValid}
          >
            {submitLabel}

            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </form>
    </Form>
  )
}
