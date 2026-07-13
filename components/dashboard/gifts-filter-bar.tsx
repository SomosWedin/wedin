'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import debounce from 'lodash.debounce';
import { Input } from '@/components/ui/input';
import { IoSearchOutline } from 'react-icons/io5';
import type { Category } from '@prisma/client';

type GiftsFilterBarProps = {
  categories: Category[];
};

export default function GiftsFilterBar({ categories }: GiftsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [search, setSearch] = useState(searchParams.get('name') ?? '');

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParamsRef.current.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  const debouncedUpdateSearch = useRef(
    debounce((value: string) => updateParam('name', value), 400)
  ).current;

  useEffect(() => {
    return () => {
      debouncedUpdateSearch.cancel();
    };
  }, [debouncedUpdateSearch]);

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-64">
        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Regalo"
          className="pl-10"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            debouncedUpdateSearch(event.target.value);
          }}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
        defaultValue={searchParams.get('category') ?? ''}
        onChange={event => updateParam('category', event.target.value)}
      >
        <option value="">Categoría</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
