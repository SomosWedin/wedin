'use client';

import { format } from 'date-fns';
import {
  IoArrowUndoOutline,
  IoCashOutline,
  IoCheckmarkCircle,
  IoCloseCircleOutline,
  IoGiftOutline,
  IoSyncOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import { Badge } from '@/components/ui/badge';
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
    icon: <IoCheckmarkCircle className="mr-1" />,
  },
  PENDING: {
    label: 'En proceso',
    className: 'bg-warning/10 text-warning border-transparent',
    icon: <IoSyncOutline className="mr-1" />,
  },
  OPEN: {
    label: 'Pendiente de pago',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoTimeOutline className="mr-1" />,
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-error/10 text-error border-transparent',
    icon: <IoCloseCircleOutline className="mr-1" />,
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoArrowUndoOutline className="mr-1" />,
  },
};

export default function DashboardTransactionsList({
  transactions,
}: DashboardTransactionsListProps) {
  const completedTransactions = transactions.filter(
    transaction => transaction.status === 'COMPLETED'
  );
  const total = completedTransactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-gray50 rounded-lg border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <div className="flex flex-col gap-1 p-6 w-full justify-center">
          <h2 className="text-lg font-bold">Resúmen de los regalos recibidos</h2>
        </div>
        <div className="flex gap-3 items-center p-6">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-full border border-gray-200">
            <IoGiftOutline className="text-xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">
              {completedTransactions.length}
            </span>
            <span className="text-sm whitespace-nowrap text-textTertiary">
              Regalos recibidos
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center p-6">
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

      <div className="bg-white rounded-lg">
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
          <div className="col-span-2">Nombre</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-2">Monto</div>
          <div className="col-span-2">Regalo</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2" />
        </div>

        {transactions.map(transaction => {
          const payerName = transaction.payerName ?? 'Anónimo';
          const estado = ESTADO_BY_STATUS[transaction.status];

          return (
            <div
              key={transaction.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="col-span-2">{payerName}</div>
              <div className="col-span-2 text-textTertiary">
                {format(transaction.createdAt, 'dd/MM/yyyy')}
              </div>
              <div className="col-span-2">
                Gs. {Number(transaction.amount).toLocaleString('es-PY')}
              </div>
              <div className="col-span-2 text-textTertiary">
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
