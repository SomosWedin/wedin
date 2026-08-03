'use client'

import type { Category } from '@prisma/client'
import debounce from 'lodash.debounce'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  type TransitionStartFunction,
  useEffect,
  useRef,
  useState,
} from 'react'
import { IoSearchOutline } from 'react-icons/io5'
import { Input } from '@/components/ui/input'

type GiftsFilterBarProps = {
  categories: Category[]
  startTransition?: TransitionStartFunction
}

export default function GiftsFilterBar({
  categories,
  startTransition,
}: GiftsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const [search, setSearch] = useState(searchParams.get('name') ?? '')

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParamsRef.current.toString())

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    const url = `${pathname}?${params.toString()}`
    if (startTransition) {
      startTransition(() => router.replace(url))
    } else {
      router.replace(url)
    }
  }

  const debouncedUpdateSearch = useRef(
    debounce((value: string) => updateParam('name', value), 400)
  ).current

  useEffect(() => {
    return () => {
      debouncedUpdateSearch.cancel()
    }
  }, [debouncedUpdateSearch])

  return (
    <div className="flex flex-col justify-start lg:justify-end gap-3 w-full sm:flex-row sm:items-center">
      <div className="relative w-full max-w-[unset] lg:max-w-64">
        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Regalo"
          className="pl-10"
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            debouncedUpdateSearch(event.target.value)
          }}
        />
      </div>
      <select
        className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm sm:w-auto"
        defaultValue={searchParams.get('category') ?? ''}
        onChange={event => updateParam('category', event.target.value)}
        id="category-filter"
      >
        <option value="">Categoría: Todas</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm sm:w-auto"
        defaultValue={searchParams.get('sort') ?? ''}
        onChange={event => updateParam('sort', event.target.value)}
        id="sort-filter"
      >
        <option value="">Ordenar por</option>
        <option value="price-asc">Precio: menor a mayor</option>
        <option value="price-desc">Precio: mayor a menor</option>
      </select>
    </div>
  )
}
