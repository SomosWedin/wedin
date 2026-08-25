'use client'

import type { Payout } from '@prisma/client'
import { format } from 'date-fns'
import { useState } from 'react'
import {
  IoCashOutline,
  IoChevronDown,
  IoChevronUp,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
import { ORGANIZER_SERVICE_FEE_RATE } from '@/actions/data/fee'
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

  const grossTotal = Math.round(summary.totalReceived)
  const serviceFee = Math.round(grossTotal * ORGANIZER_SERVICE_FEE_RATE)
  const netTotal = grossTotal - serviceFee

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="p-6 text-lg font-bold border-b border-gray-200">
          Resumen de tu billetera
        </h2>

        <div className="grid grid-cols-1 divide-y divide-gray-200 md:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.8fr)] md:divide-x md:divide-y-0">
          <div className="p-6 min-w-0">
            <span className="text-xs font-semibold tracking-wide uppercase text-textTertiary">
              Total neto
            </span>
            <span className="block mt-1 text-3xl font-bold tracking-tight whitespace-nowrap">
              Gs. {netTotal.toLocaleString('es-PY')}
            </span>

            <div className="flex flex-col gap-2 mt-5 max-w-lg">
              <div className="grid grid-cols-[minmax(0,1fr)_max-content] gap-4 text-sm text-textTertiary">
                <span>Total recibido</span>
                <span className="whitespace-nowrap tabular-nums">
                  Gs. {grossTotal.toLocaleString('es-PY')}
                </span>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_max-content] gap-4 text-sm text-red-600">
                <span>Costo de servicio (4,9%)</span>
                <span className="whitespace-nowrap tabular-nums">
                  − Gs. {serviceFee.toLocaleString('es-PY')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-6 min-w-0">
            <div className="flex justify-center items-center w-11 h-11 bg-white rounded-full border border-gray-200 shrink-0">
              <IoCashOutline className="text-xl" />
            </div>

            <div className="min-w-0">
              <span className="block text-2xl font-bold tracking-tight whitespace-nowrap tabular-nums">
                Gs. {summary.balance.toLocaleString('es-PY')}
              </span>

              <span className="block text-sm text-textTertiary">
                Disponible para retiro
              </span>
            </div>
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
