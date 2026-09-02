'use client'

import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type GiftMultiSelectOption = {
  id: string
  name: string
  categoryName: string
  eventTypeIds: string[]
}

type GiftMultiSelectProps = {
  gifts: GiftMultiSelectOption[]
  selectedIds: string[]
  onChange: (giftIds: string[]) => void
  disabled?: boolean
}

export default function GiftMultiSelect({
  gifts,
  selectedIds,
  onChange,
  disabled = false,
}: GiftMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedGifts = gifts.filter(gift => selectedIds.includes(gift.id))

  const toggle = (giftId: string) => {
    onChange(
      selectedIds.includes(giftId)
        ? selectedIds.filter(id => id !== giftId)
        : [...selectedIds, giftId]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedGifts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGifts.map(gift => (
            <Badge
              key={gift.id}
              variant="secondary"
              className="gap-1 bg-gray100 text-textPrimary"
            >
              {gift.name}
              <button
                type="button"
                aria-label={`Quitar ${gift.name}`}
                className="rounded-sm hover:bg-black/10"
                onClick={() => toggle(gift.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selectedGifts.length
              ? `${selectedGifts.length} regalo${selectedGifts.length === 1 ? '' : 's'} seleccionado${selectedGifts.length === 1 ? '' : 's'}`
              : 'Elegí regalos'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] bg-white p-0 shadow-lg"
        >
          <Command className="bg-white">
            <CommandInput placeholder="Buscar regalo..." />
            <CommandList>
              <CommandEmpty>No se encontraron regalos.</CommandEmpty>
              <CommandGroup>
                {gifts.map(gift => {
                  const selected = selectedIds.includes(gift.id)

                  return (
                    <CommandItem
                      key={gift.id}
                      value={`${gift.name} ${gift.categoryName}`}
                      onSelect={() => toggle(gift.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{gift.name}</span>
                        <span className="truncate text-xs text-textTertiary">
                          {gift.categoryName}
                        </span>
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
