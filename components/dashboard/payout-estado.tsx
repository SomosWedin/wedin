import type { PayoutStatus } from '@prisma/client';
import { IoCheckmark, IoClose, IoSync, IoTimeOutline } from 'react-icons/io5';

export const ESTADO_BY_PAYOUT_STATUS: Record<
  PayoutStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  REQUESTED: {
    label: 'Pendiente',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoTimeOutline className="mr-1 text-textTertiary" />,
  },
  PROCESSING: {
    label: 'En proceso',
    className: 'bg-warning/10 text-warning border-transparent',
    icon: <IoSync className="mr-1 text-warning" />,
  },
  COMPLETED: {
    label: 'Confirmado',
    className: 'bg-success/10 text-success border-transparent',
    icon: <IoCheckmark className="mr-1 text-success" />,
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'bg-error/10 text-error border-transparent',
    icon: <IoClose className="mr-1 text-error" />,
  },
};

export const ESTADO_OPTIONS_PAYOUT = (
  Object.entries(ESTADO_BY_PAYOUT_STATUS) as [
    PayoutStatus,
    { label: string },
  ][]
).map(([status, { label }]) => ({ value: status, label }));
