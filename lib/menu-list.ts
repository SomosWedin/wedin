import {
  Gift,
  House,
  List,
  type LucideIcon,
  SettingsIcon,
  Sparkles,
  Wallet,
} from 'lucide-react'

type Submenu = {
  href: string
  label: string
  active?: boolean
}

type Menu = {
  href: string
  label: string
  active?: boolean
  icon: LucideIcon
  submenus?: Submenu[]
}

type Group = {
  groupLabel: string
  menus: Menu[]
}

export function getMenuList(): Group[] {
  return [
    {
      groupLabel: '',
      menus: [
        {
          href: '/dashboard',
          label: 'Inicio',
          icon: House,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: '',
      menus: [
        {
          href: '/event-details',
          label: 'Presentación',
          icon: Sparkles,
        },
        {
          href: '/wishlist',
          label: 'Mi lista',
          icon: List,
        },
        {
          href: '',
          label: 'Generales',
          icon: SettingsIcon,
          submenus: [
            {
              href: '/event-settings',
              label: 'Detalles de tu evento',
            },
            {
              href: '/bank-details',
              label: 'Datos de tu cuenta',
            },
          ],
        },
      ],
    },
    {
      groupLabel: '',
      menus: [
        {
          href: '/transactions',
          label: 'Regalos recibidos',
          icon: Gift,
        },
        {
          href: '/billetera',
          label: 'Mi billetera',
          icon: Wallet,
        },
      ],
    },
  ]
}
