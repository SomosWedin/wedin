'use client'

import type { Payout } from '@prisma/client'
import { format } from 'date-fns'
import { useState } from 'react'
import {
  IoCashOutline,
  IoChevronDown,
  IoChevronUp,
  IoGiftOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
import {
  ESTADO_BY_PAYOUT_STATUS,
  ESTADO_OPTIONS_PAYOUT,
} from '@/components/dashboard/payout-estado'
import { Badge } from '@/components/ui/badge'

type WalletSummary = {
  totalReceived: number
  giftsCount: number
  balance: number
}

type WalletPayoutsListProps = {
  summary: WalletSummary
  payouts: Payout[]
}

type SortColumn = 'createdAt' | 'amount'
type SortDirection = 'asc' | 'desc'

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn
  activeColumn: SortColumn | null
  direction: SortDirection
}) {
  if (activeColumn !== column) {
    return <IoSwapVerticalOutline className="text-gray-400" />
  }

  return direction === 'asc' ? <IoChevronUp /> : <IoChevronDown />
}

export default function WalletPayoutsList({
  summary,
  payouts,
}: WalletPayoutsListProps) {
  const [estadoFilter, setEstadoFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('desc')
      return
    }

    setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'))
  }

  const filteredPayouts = payouts.filter(
    payout => !estadoFilter || payout.status === estadoFilter
  )

  const sortedPayouts = sortColumn
    ? [...filteredPayouts].sort((a, b) => {
        const diff =
          sortColumn === 'createdAt'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : Number(a.amount) - Number(b.amount)

        return sortDirection === 'asc' ? diff : -diff
      })
    : filteredPayouts

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 max-h-[unset] sm:max-h-24">
        <div className="flex flex-col gap-1 p-6 w-full justify-center">
          <h2 className="text-lg font-bold">Resúmen de tu billetera</h2>
        </div>
        <div className="flex gap-3 items-center p-6 w-1/2">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoGiftOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">
              Gs. {summary.totalReceived.toLocaleString('es-PY')}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Regalos recibidos
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-6 w-1/2">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoCashOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">
              Gs. {summary.balance.toLocaleString('es-PY')}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Disponible para retiro
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-between items-start sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold">Historial</h2>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Estado: Todos</option>
          {ESTADO_OPTIONS_PAYOUT.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-3">Descripción</div>
          <button
            type="button"
            className="flex col-span-3 gap-3 items-center text-left hover:text-textPrimary"
            onClick={() => handleSort('createdAt')}
          >
            Fecha
            <SortIcon
              column="createdAt"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <button
            type="button"
            className="flex col-span-3 gap-3 items-center text-left hover:text-textPrimary"
            onClick={() => handleSort('amount')}
          >
            Monto
            <SortIcon
              column="amount"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <div className="col-span-3">Estado</div>
        </div>

        {sortedPayouts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron movimientos
          </div>
        )}

        {sortedPayouts.map(payout => {
          const estado = ESTADO_BY_PAYOUT_STATUS[payout.status]

          return (
            <div
              key={payout.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="col-span-3">Transferencia a cuenta</div>
              <div className="col-span-3 text-textTertiary text-sm">
                {format(payout.createdAt, 'dd/MM/yyyy')}
              </div>
              <div className="col-span-3">
                Gs. {Number(payout.amount).toLocaleString('es-PY')}
              </div>
              <div className="col-span-3">
                <Badge className={estado.className}>
                  {estado.icon}
                  {estado.label}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
