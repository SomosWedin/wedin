'use client'

import type { Payout } from '@prisma/client'
import { addBusinessDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import {
  IoCheckmarkCircleOutline,
  IoChevronDown,
  IoTimeOutline,
  IoWalletOutline,
} from 'react-icons/io5'
import type { WalletSummary } from '@/actions/data/payout'
import EmptyState from '@/components/common/empty-state'
import {
  ESTADO_BY_PAYOUT_STATUS,
  ESTADO_OPTIONS_PAYOUT,
} from '@/components/dashboard/payout-estado'
import RequestPayoutDialog from '@/components/dialog/request-payout-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type WalletOverviewProps = {
  eventId: string
  summary: WalletSummary
  payouts: Payout[]
}

const PAYOUT_BUSINESS_DAYS = 3

const formatGs = (amount: number) => `Gs. ${amount.toLocaleString('es-PY')}`

const formatShortDate = (date: Date) =>
  format(date, "d 'de' MMMM", { locale: es })

const estimatedArrival = (payout: Payout) =>
  addBusinessDays(payout.createdAt, PAYOUT_BUSINESS_DAYS)

function BalanceBreakdown({ summary }: { summary: WalletSummary }) {
  const rows = [
    { label: 'Regalos recibidos', value: formatGs(summary.totalReceived) },
    {
      label: 'Costo de servicio (4,9% + IVA)',
      value: `− ${formatGs(summary.serviceFee)}`,
    },
    {
      label: 'Retiros solicitados',
      value: `− ${formatGs(summary.totalRequested)}`,
    },
  ]

  return (
    <Collapsible
      defaultOpen
      className="overflow-hidden bg-white rounded-lg border border-gray-200 group"
    >
      <CollapsibleTrigger className="flex justify-between items-center px-6 py-4 w-full text-sm font-semibold text-left hover:bg-gray-50">
        Cómo se calcula tu saldo
        <IoChevronDown className="text-textTertiary transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="flex flex-col gap-3 px-6 pt-2 pb-6 border-t border-gray-200">
          {rows.map(row => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_max-content] gap-4 text-sm text-textTertiary"
            >
              <span>{row.label}</span>
              <span className="whitespace-nowrap tabular-nums">
                {row.value}
              </span>
            </div>
          ))}

          <div className="grid grid-cols-[minmax(0,1fr)_max-content] gap-4 pt-3 text-sm font-semibold border-t border-gray-200">
            <span>Disponible para retiro</span>
            <span className="whitespace-nowrap tabular-nums">
              {formatGs(summary.balance)}
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function StatusCards({
  summary,
  payouts,
}: {
  summary: WalletSummary
  payouts: Payout[]
}) {
  const inTransitPayouts = payouts.filter(
    payout => payout.status === 'REQUESTED' || payout.status === 'PROCESSING'
  )

  const lastArrival = inTransitPayouts.length
    ? new Date(
        Math.max(
          ...inTransitPayouts.map(payout => estimatedArrival(payout).getTime())
        )
      )
    : null

  const inTransitLabel = lastArrival
    ? `${inTransitPayouts.length} ${
        inTransitPayouts.length === 1
          ? 'retiro en proceso · llega'
          : 'retiros en proceso · llegan'
      } el ${formatShortDate(lastArrival)}`
    : 'Sin retiros en proceso'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <span className="flex gap-2 items-center text-sm text-textTertiary">
          <IoTimeOutline className="text-warning" />
          En camino a tu cuenta
        </span>
        <span className="block mt-1 text-2xl font-bold tracking-tight tabular-nums">
          {formatGs(summary.inTransit)}
        </span>
        <span className="block mt-1 text-sm text-textTertiary">
          {inTransitLabel}
        </span>
      </div>

      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <span className="flex gap-2 items-center text-sm text-textTertiary">
          <IoCheckmarkCircleOutline className="text-success" />
          Ya cobrado
        </span>
        <span className="block mt-1 text-2xl font-bold tracking-tight tabular-nums">
          {formatGs(summary.settled)}
        </span>
        <span className="block mt-1 text-sm text-textTertiary">
          Acreditado en tu banco
        </span>
      </div>
    </div>
  )
}

function PayoutRow({ payout }: { payout: Payout }) {
  const estado = ESTADO_BY_PAYOUT_STATUS[payout.status]
  const showArrival =
    payout.status === 'REQUESTED' || payout.status === 'PROCESSING'

  return (
    <div className="flex flex-col gap-2 justify-between px-4 py-4 border-b border-gray-100 sm:flex-row sm:items-center last:border-b-0">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium">Retiro a tu cuenta</span>

        <div className="flex flex-wrap gap-2 items-center text-sm text-textTertiary">
          <span>{format(payout.createdAt, 'd MMM', { locale: es })}</span>
          <Badge className={estado.className}>
            {estado.icon}
            {estado.label}
          </Badge>
          {showArrival && (
            <span>· llega el {formatShortDate(estimatedArrival(payout))}</span>
          )}
        </div>
      </div>

      <span className="whitespace-nowrap tabular-nums shrink-0">
        − {formatGs(Number(payout.amount))}
      </span>
    </div>
  )
}

export default function WalletOverview({
  eventId,
  summary,
  payouts,
}: WalletOverviewProps) {
  const [estadoFilter, setEstadoFilter] = useState('')

  const filteredPayouts = payouts.filter(
    payout => !estadoFilter || payout.status === estadoFilter
  )

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <span className="text-sm text-textTertiary">
          Disponible para retiro
        </span>
        <span className="block mt-1 text-4xl font-black tracking-tight tabular-nums sm:text-5xl">
          {formatGs(summary.balance)}
        </span>

        <div className="flex flex-col gap-3 items-start mt-6 sm:flex-row sm:items-center">
          <RequestPayoutDialog eventId={eventId} balance={summary.balance} />
          <p className="text-sm text-textTertiary">
            Llega a tu cuenta bancaria 72 horas hábiles después de solicitarlo.
          </p>
        </div>
      </div>

      <StatusCards summary={summary} payouts={payouts} />

      <BalanceBreakdown summary={summary} />

      <div className="flex flex-col gap-3 justify-between items-start sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold">Movimientos</h2>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Todos los movimientos</option>
          {ESTADO_OPTIONS_PAYOUT.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {payouts.length === 0 ? (
        <EmptyState
          icon={<IoWalletOutline className="text-4xl sm:text-6xl" />}
          title="Sin movimientos"
          description="Todavía no has solicitado ningún retiro"
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          {filteredPayouts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No se encontraron movimientos
            </div>
          ) : (
            filteredPayouts.map(payout => (
              <PayoutRow key={payout.id} payout={payout} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
