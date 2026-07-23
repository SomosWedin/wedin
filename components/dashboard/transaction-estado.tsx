import {
  IoArrowUndoOutline,
  IoBusinessOutline,
  IoCardOutline,
  IoCheckmark,
  IoClose,
  IoSync,
  IoTimeOutline,
} from 'react-icons/io5';
import type { PaymentMethod, TransactionStatus } from '@prisma/client';

export const ESTADO_BY_STATUS: Record<
  TransactionStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  COMPLETED: {
    label: 'Recibido',
    className: 'bg-success/10 text-success border-transparent',
    icon: <IoCheckmark className="mr-1 text-success" />,
  },
  PENDING: {
    label: 'En proceso',
    className: 'bg-warning/10 text-warning border-transparent',
    icon: <IoSync className="mr-1 text-warning" />,
  },
  OPEN: {
    label: 'Pendiente',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoTimeOutline className="mr-1 text-textTertiary" />,
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-error/10 text-error border-transparent',
    icon: <IoClose className="mr-1 text-error" />,
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoArrowUndoOutline className="mr-1 text-textTertiary" />,
  },
};

export const ESTADO_OPTIONS = (
  Object.entries(ESTADO_BY_STATUS) as [TransactionStatus, { label: string }][]
).map(([status, { label }]) => ({ value: status, label }));

export const PAYMENT_METHOD_ICON: Record<
  PaymentMethod,
  { icon: React.ReactNode; title: string }
> = {
  CARD: { icon: <IoCardOutline />, title: 'Pago con tarjeta' },
  BANK_TRANSFER: {
    icon: <IoBusinessOutline />,
    title: 'Transferencia bancaria',
  },
};
