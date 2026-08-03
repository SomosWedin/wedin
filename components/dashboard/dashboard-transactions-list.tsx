'use client';

import ThankTransactionDialog from '@/components/dialog/thank-transaction-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  IoCashOutline,
  IoChevronDown,
  IoChevronUp,
  IoGiftOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5';
import {
  ESTADO_BY_STATUS,
  ESTADO_OPTIONS,
  PAYMENT_METHOD_ICON,
} from './transaction-estado';

type TransactionWithGift = Prisma.TransactionGetPayload<{
  include: { wishlistGift: { include: { gift: true } } };
}>;

type WishlistGiftWithGift = Prisma.WishlistGiftGetPayload<{
  include: { gift: { include: { image: true } } };
}>;

type DashboardTransactionsListProps = {
  transactions: TransactionWithGift[];
  wishlistGifts: WishlistGiftWithGift[];
};

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
  wishlistGifts,
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

  const completedTransactions = transactions.filter(
    transaction => transaction.status === 'COMPLETED'
  );
  const total = completedTransactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );

  const activeWishlistGifts = wishlistGifts.filter(
    wishlistGift => !wishlistGift.isReceived
  );
  const receivedCount = activeWishlistGifts.filter(
    wishlistGift => wishlistGift.isFullyPaid || wishlistGift.isManuallyReceived
  ).length;
  const totalWishlistGifts = activeWishlistGifts.length;
  const totalGiftsPrice = activeWishlistGifts.reduce(
    (sum, wishlistGift) => sum + (Number(wishlistGift.gift.price) || 0),
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
    const matchesEstado = !estadoFilter || transaction.status === estadoFilter;

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
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 max-h-[unset] sm:max-h-24">
        <div className="flex flex-col gap-1 p-4 sm:p-6 w-full justify-center">
          <h2 className="text-lg font-bold">
            Resúmen de los regalos recibidos
          </h2>
        </div>
        {receivedCount >= 1 && (
          <div className="flex gap-3 items-center p-4 sm:p-6 w-full sm:w-1/2">
            <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
              <IoGiftOutline className="text-xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {receivedCount} / {totalWishlistGifts}
              </span>
              <span className="text-sm whitespace-nowrap text-textTertiary">
                Regalos recibidos
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-3 items-center p-4 sm:p-6 w-full sm:w-1/2">
          <div className="flex shrink-0 justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoCashOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-textPrimary">
              Gs. {total.toLocaleString('es-PY')}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              recaudados de Gs. {totalGiftsPrice.toLocaleString('es-PY')}
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
          <option value="">Estado: Todos</option>
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
          const paymentMethod = PAYMENT_METHOD_ICON[transaction.paymentMethod];
          const estado = ESTADO_BY_STATUS[transaction.status];

          return (
            <div
              key={transaction.id}
              className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center gap-2 sm:contents">
                <div className="flex col-span-2 gap-2 sm:gap-4 items-center">
                  <span
                    className="shrink-0 text-xl text-gray-400"
                    title={paymentMethod.title}
                  >
                    {paymentMethod.icon}
                  </span>
                  {payerName}
                </div>
                <div className="col-span-2 text-textTertiary text-sm">
                  {format(transaction.createdAt, 'dd/MM/yyyy')}
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 sm:contents">
                <div className="col-span-2">
                  Gs. {Number(transaction.amount).toLocaleString('es-PY')}
                </div>
                <div className="col-span-2 text-textTertiary text-sm">
                  {transaction.wishlistGift.gift.name}
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 sm:contents">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
