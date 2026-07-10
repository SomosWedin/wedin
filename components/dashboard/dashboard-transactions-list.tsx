'use client';

import { IoCashOutline, IoGiftOutline } from 'react-icons/io5';
import ThankTransactionDialog from '@/components/dialog/thank-transaction-dialog';
import type { Prisma } from '@prisma/client';

type TransactionWithGift = Prisma.TransactionGetPayload<{
  include: { wishlistGift: { include: { gift: true } } };
}>;

type DashboardTransactionsListProps = {
  transactions: TransactionWithGift[];
};

export default function DashboardTransactionsList({
  transactions,
}: DashboardTransactionsListProps) {
  const total = transactions.reduce(
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
            <span className="text-lg font-bold">{transactions.length}</span>
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
          <div className="col-span-3">Nombre</div>
          <div className="col-span-3">Monto</div>
          <div className="col-span-3">Regalo</div>
          <div className="col-span-3" />
        </div>

        {transactions.map(transaction => {
          const payerName = transaction.payerName ?? 'Anónimo';

          return (
            <div
              key={transaction.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-4 py-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="col-span-3 font-medium">{payerName}</div>
              <div className="col-span-3 text-sm">
                Gs. {Number(transaction.amount).toLocaleString('es-PY')}
              </div>
              <div className="col-span-3 text-sm text-textTertiary">
                {transaction.wishlistGift.gift.name}
              </div>
              <div className="flex col-span-3 justify-start sm:justify-end">
                <ThankTransactionDialog
                  transaction={transaction}
                  payerName={payerName}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
