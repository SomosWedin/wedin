'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  IoArrowUndoOutline,
  IoCashOutline,
  IoCheckmark,
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoGiftOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
  IoSync,
  IoTimeOutline,
} from 'react-icons/io5';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ThankTransactionDialog from '@/components/dialog/thank-transaction-dialog';
import type { Prisma, TransactionStatus } from '@prisma/client';

type TransactionWithGift = Prisma.TransactionGetPayload<{
  include: { wishlistGift: { include: { gift: true } } };
}>;

type DashboardTransactionsListProps = {
  transactions: TransactionWithGift[];
};

const ESTADO_BY_STATUS: Record<
  TransactionStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  COMPLETED: {
    label: 'Recibido',
    className: 'bg-success/10 text-success border-transparent',
    icon: <IoCheckmark className="mr-1" />,
  },
  PENDING: {
    label: 'En proceso',
    className: 'bg-warning/10 text-warning border-transparent',
    icon: <IoSync className="mr-1" />,
  },
  OPEN: {
    label: 'Pendiente',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoTimeOutline className="mr-1" />,
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-error/10 text-error border-transparent',
    icon: <IoClose className="mr-1" />,
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoArrowUndoOutline className="mr-1" />,
  },
};

const ESTADO_OPTIONS = (
  Object.entries(ESTADO_BY_STATUS) as [TransactionStatus, { label: string }][]
).map(([status, { label }]) => ({ value: status, label }));

type SortColumn = 'createdAt' | 'amount';
type SortDirection = 'asc' | 'desc';

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
}) {
  if (activeColumn !== column) {
    return <IoSwapVerticalOutline className="text-gray-400" />;
  }

  return direction === 'asc' ? <IoChevronUp /> : <IoChevronDown />;
}

export default function DashboardTransactionsList({
  transactions,
}: DashboardTransactionsListProps) {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('desc');
      return;
    }

    setSortDirection(direction => (direction === 'desc' ? 'asc' : 'desc'));
  };

  const total = transactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );

  const filteredTransactions = transactions.filter(transaction => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      (transaction.payerName ?? '').toLowerCase().includes(normalizedSearch) ||
      transaction.wishlistGift.gift.name
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesEstado =
      !estadoFilter || transaction.status === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  const sortedTransactions = sortColumn
    ? [...filteredTransactions].sort((a, b) => {
        const diff =
          sortColumn === 'createdAt'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : Number(a.amount) - Number(b.amount);

        return sortDirection === 'asc' ? diff : -diff;
      })
    : filteredTransactions;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 max-h-24">
        <div className="flex flex-col gap-1 p-6 w-full justify-center">
          <h2 className="text-lg font-bold">
            Resúmen de los regalos recibidos
          </h2>
        </div>
        <div className="flex gap-3 items-center p-6 w-1/2">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoGiftOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{transactions.length}</span>
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
              Gs. {total.toLocaleString('es-PY')}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Equivalente en efectivo
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Nombre o regalo"
            className="pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 h-10 text-sm bg-white rounded-md border border-input"
          value={estadoFilter}
          onChange={event => setEstadoFilter(event.target.value)}
        >
          <option value="">Estado</option>
          {ESTADO_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-2">Nombre</div>
          <button
            type="button"
            className="flex col-span-2 gap-3 items-center text-left hover:text-textPrimary"
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
          <div className="col-span-2">Estado</div>
          <div className="col-span-2" />
        </div>

        {sortedTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron regalos
          </div>
        )}

        {sortedTransactions.map(transaction => {
          const payerName = transaction.payerName ?? 'Anónimo';
          const estado = ESTADO_BY_STATUS[transaction.status];

          return (
            <div
              key={transaction.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="col-span-2">{payerName}</div>
              <div className="col-span-2 text-textTertiary text-sm">
                {format(transaction.createdAt, 'dd/MM/yyyy')}
              </div>
              <div className="col-span-2">
                Gs. {Number(transaction.amount).toLocaleString('es-PY')}
              </div>
              <div className="col-span-2 text-textTertiary text-sm">
                {transaction.wishlistGift.gift.name}
              </div>
              <div className="col-span-2">
                <Badge className={estado.className}>
                  {estado.icon}
                  {estado.label}
                </Badge>
              </div>
              <div className="flex col-span-2 justify-start sm:justify-end">
                {transaction.status === 'COMPLETED' && (
                  <ThankTransactionDialog
                    transaction={transaction}
                    payerName={payerName}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
