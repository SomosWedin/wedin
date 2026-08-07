import type { GuestStatus } from '@prisma/client'
import { IoCheckmark, IoClose, IoTimeOutline } from 'react-icons/io5'

export const ESTADO_BY_GUEST_STATUS: Record<
  GuestStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-success/10 text-success border-transparent',
    icon: <IoCheckmark className="mr-1 text-success" />,
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-gray100 text-textTertiary border-transparent',
    icon: <IoTimeOutline className="mr-1 text-textTertiary" />,
  },
  DECLINED: {
    label: 'Cancelado',
    className: 'bg-error/10 text-error border-transparent',
    icon: <IoClose className="mr-1 text-error" />,
  },
}

export const GUEST_ESTADO_OPTIONS = (
  Object.entries(ESTADO_BY_GUEST_STATUS) as [
    GuestStatus,
    { label: string },
  ][]
).map(([status, { label }]) => ({ value: status, label }))
