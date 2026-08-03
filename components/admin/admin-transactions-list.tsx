'use client'

import type { PaymentMethod, Prisma, TransactionStatus } from '@prisma/client'
import { endOfDay, format } from 'date-fns'
import { useMemo, useState } from 'react'
import {
  IoChevronDown,
  IoChevronUp,
  IoSearchOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5'
import {
  ESTADO_BY_STATUS,
  ESTADO_OPTIONS,
  PAYMENT_METHOD_ICON,
} from '@/components/dashboard/transaction-estado'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { useAdminTransactionStatus } from '@/hooks/admin/use-admin-transaction-status'
import { coupleName } from '@/lib/utils'

type TransactionWithGiftAndEvent = Prisma.TransactionGetPayload<{
  include: {
    wishlistGift: { include: { gift: true } }
    event: { include: { users: true } }
  }
}>

type AdminTransactionsListProps = {
  transactions: TransactionWithGiftAndEvent[]
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

export default function AdminTransactionsList({
  transactions,
}: AdminTransactionsListProps) {
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const { loading, updateStatus } = useAdminTransactionStatus()

  const eventOptions = useMemo(() => {
    const byLabel = new Map<string, string>()

    for (const transaction of transactions) {
      const label = coupleName(transaction.event.users)
      byLabel.set(label, transaction.event.id)
    }

    return Array.from(byLabel, ([label, value]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label)
    )
  }, [transactions])

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection('desc')
      return
    }

    setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'))
  }

  const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const toDate = dateTo ? endOfDay(new Date(`${dateTo}T00:00:00`)) : null

  const filteredTransactions = transactions.filter(transaction => {
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      (transaction.payerName ?? '').toLowerCase().includes(normalizedSearch) ||
      transaction.wishlistGift.gift.name
        .toLowerCase()
        .includes(normalizedSearch) ||
      coupleName(transaction.event.users)
        .toLowerCase()
        .includes(normalizedSearch)
    const matchesEstado = !estadoFilter || transaction.status === estadoFilter
    const matchesPaymentMethod =
      !paymentMethodFilter || transaction.paymentMethod === paymentMethodFilter
    const matchesEvent =
      !eventFilter || coupleName(transaction.event.users) === eventFilter
    const matchesDateRange =
      (!fromDate || transaction.createdAt >= fromDate) &&
      (!toDate || transaction.createdAt <= toDate)

    return (
      matchesSearch &&
      matchesEstado &&
      matchesPaymentMethod &&
      matchesEvent &&
      matchesDateRange
    )
  })

  const sortedTransactions = sortColumn
    ? [...filteredTransactions].sort((a, b) => {
        const diff =
          sortColumn === 'createdAt'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : Number(a.amount) - Number(b.amount)

        return sortDirection === 'asc' ? diff : -diff
      })
    : filteredTransactions

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Nombre, evento o regalo"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <Combobox
          options={eventOptions}
          selected={eventFilter}
          onChange={value => setEventFilter(value as string)}
          placeholder="Buscar evento"
          className="sm:w-56"
          width="w-56"
          clearable
        />
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Estado: Todos</option>
          {ESTADO_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={paymentMethodFilter}
          onChange={event => setPaymentMethodFilter(event.target.value)}
        >
          <option value="">Método: Todos</option>
          {(
            Object.entries(PAYMENT_METHOD_ICON) as [
              PaymentMethod,
              { title: string },
            ][]
          ).map(([value, { title }]) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Desde"
            className="h-10 w-[9.5rem] cursor-pointer"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={event => setDateFrom(event.target.value)}
            onClick={event => event.currentTarget.showPicker?.()}
          />
          <span className="text-gray-400">–</span>
          <Input
            type="date"
            aria-label="Hasta"
            className="h-10 w-[9.5rem] cursor-pointer"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={event => setDateTo(event.target.value)}
            onClick={event => event.currentTarget.showPicker?.()}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-2">Nombre</div>
          <div className="col-span-2">Evento</div>
          <button
            type="button"
            className="flex col-span-1 gap-3 items-center text-left hover:text-textPrimary"
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
            className="flex col-span-2 gap-3 items-center text-left hover:text-textPrimary"
            onClick={() => handleSort('amount')}
          >
            Monto
            <SortIcon
              column="amount"
              activeColumn={sortColumn}
              direction={sortDirection}
            />
          </button>
          <div className="col-span-2">Regalo</div>
          <div className="col-span-3">Estado</div>
        </div>

        {sortedTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron transacciones
          </div>
        )}

        {sortedTransactions.map(transaction => {
          const payerName = transaction.payerName ?? 'Anónimo'
          const paymentMethod = PAYMENT_METHOD_ICON[transaction.paymentMethod]
          const estado = ESTADO_BY_STATUS[transaction.status]

          return (
            <div
              key={transaction.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex col-span-2 gap-4 items-center">
                <span
                  className="shrink-0 text-xl text-gray-400"
                  title={paymentMethod.title}
                >
                  {paymentMethod.icon}
                </span>
                {payerName}
              </div>
              <div className="col-span-2 text-textTertiary text-sm">
                {coupleName(transaction.event.users)}
              </div>
              <div className="col-span-1 text-textTertiary text-sm">
                {format(transaction.createdAt, 'dd/MM/yyyy')}
              </div>
              <div className="col-span-2">
                Gs. {Number(transaction.amount).toLocaleString('es-PY')}
              </div>
              <div className="col-span-2 text-textTertiary text-sm">
                {transaction.wishlistGift.gift.name}
              </div>
              <div className="flex col-span-3 gap-2 items-center">
                {estado.icon}
                {transaction.paymentMethod === 'CARD' ? (
                  <span
                    className="px-2 py-1.5 text-sm text-textTertiary"
                    title="Pagopar administra el estado de los pagos con tarjeta"
                  >
                    {estado.label}
                  </span>
                ) : (
                  <select
                    className="px-2 py-1.5 h-9 text-sm bg-white rounded-md border border-input disabled:opacity-50"
                    value={transaction.status}
                    disabled={loading}
                    onChange={event =>
                      updateStatus(
                        transaction.id,
                        event.target.value as TransactionStatus
                      )
                    }
                  >
                    {ESTADO_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
