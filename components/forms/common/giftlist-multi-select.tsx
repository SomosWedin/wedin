'use client'

import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import type { GiftlistOption } from '@/actions/data/giftlist'
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

type GiftlistMultiSelectProps = {
  giftlists: GiftlistOption[]
  selectedIds: string[]
  onChange: (giftlistIds: string[]) => void
  availableIds?: string[]
  disabled?: boolean
}

export default function GiftlistMultiSelect({
  giftlists,
  selectedIds,
  onChange,
  availableIds,
  disabled = false,
}: GiftlistMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedGiftlists = giftlists.filter(giftlist =>
    selectedIds.includes(giftlist.id)
  )
  const availableGiftlists = availableIds
    ? giftlists.filter(giftlist => availableIds.includes(giftlist.id))
    : giftlists

  const toggle = (giftlistId: string) => {
    onChange(
      selectedIds.includes(giftlistId)
        ? selectedIds.filter(id => id !== giftlistId)
        : [...selectedIds, giftlistId]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedGiftlists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGiftlists.map(giftlist => (
            <Badge
              key={giftlist.id}
              variant="secondary"
              className="gap-1 bg-gray100 text-textPrimary"
            >
              {giftlist.name}
              <button
                type="button"
                aria-label={`Quitar ${giftlist.name}`}
                className="rounded-sm hover:bg-black/10"
                onClick={() => toggle(giftlist.id)}
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
            {selectedGiftlists.length
              ? `${selectedGiftlists.length} colección${selectedGiftlists.length === 1 ? '' : 'es'} seleccionada${selectedGiftlists.length === 1 ? '' : 's'}`
              : 'Elegí colecciones'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] bg-white p-0 shadow-lg"
        >
          <Command className="bg-white">
            <CommandInput placeholder="Buscar colección..." />
            <CommandList>
              <CommandEmpty>No se encontraron colecciones.</CommandEmpty>
              <CommandGroup>
                {availableGiftlists.map(giftlist => {
                  const selected = selectedIds.includes(giftlist.id)

                  return (
                    <CommandItem
                      key={giftlist.id}
                      value={giftlist.name}
                      onSelect={() => toggle(giftlist.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {giftlist.name}
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
