'use client'

import { useState } from 'react'

const DEFAULT_PAGE_SIZE = 50

export type PaginationState = {
  page: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  total: number
  onPageChange: (page: number) => void
}

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [renderedItems, setRenderedItems] = useState(items)

  if (items !== renderedItems) {
    setRenderedItems(items)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    pageItems: items.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      totalPages,
      rangeStart: items.length === 0 ? 0 : start + 1,
      rangeEnd: Math.min(start + pageSize, items.length),
      total: items.length,
      onPageChange: setPage,
    } satisfies PaginationState,
  }
}
