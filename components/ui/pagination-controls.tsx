'use client'

import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { Button } from '@/components/ui/button'
import type { PaginationState } from '@/hooks/use-pagination'

export default function PaginationControls({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  onPageChange,
}: PaginationState) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
      <p className="text-sm text-textTertiary">
        Mostrando {rangeStart}–{rangeEnd} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Página anterior"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <IoChevronBack />
        </Button>
        <span className="text-sm text-textTertiary">
          Página {page} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Página siguiente"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <IoChevronForward />
        </Button>
      </div>
    </div>
  )
}
