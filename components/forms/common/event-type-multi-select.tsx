'use client'

import type { EventType } from '@prisma/client'
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

type EventTypeMultiSelectProps = {
  eventTypes: EventType[]
  selectedIds: string[]
  onChange: (eventTypeIds: string[]) => void
}

export default function EventTypeMultiSelect({
  eventTypes,
  selectedIds,
  onChange,
}: EventTypeMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedTypes = eventTypes.filter(eventType =>
    selectedIds.includes(eventType.id)
  )

  const toggle = (eventTypeId: string) => {
    onChange(
      selectedIds.includes(eventTypeId)
        ? selectedIds.filter(id => id !== eventTypeId)
        : [...selectedIds, eventTypeId]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTypes.map(eventType => (
            <Badge
              key={eventType.id}
              variant="secondary"
              className="gap-1 bg-gray100 text-textPrimary"
            >
              {eventType.name}
              <button
                type="button"
                aria-label={`Quitar ${eventType.name}`}
                className="rounded-sm hover:bg-black/10"
                onClick={() => toggle(eventType.id)}
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
            className="w-full justify-between font-normal"
          >
            {selectedTypes.length
              ? `${selectedTypes.length} tipo${selectedTypes.length === 1 ? '' : 's'} seleccionado${selectedTypes.length === 1 ? '' : 's'}`
              : 'Elegí tipos de evento'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] bg-white p-0 shadow-lg"
        >
          <Command className="bg-white">
            <CommandInput placeholder="Buscar tipo de evento..." />
            <CommandList>
              <CommandEmpty>No se encontraron tipos de evento.</CommandEmpty>
              <CommandGroup>
                {eventTypes.map(eventType => {
                  const selected = selectedIds.includes(eventType.id)

                  return (
                    <CommandItem
                      key={eventType.id}
                      value={eventType.name}
                      onSelect={() => toggle(eventType.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {eventType.name}
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
