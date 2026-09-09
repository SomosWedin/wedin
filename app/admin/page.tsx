import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { IconType } from 'react-icons'
import {
  IoCalendarOutline,
  IoCashOutline,
  IoFolderOpenOutline,
  IoGiftOutline,
  IoPeopleOutline,
  IoPricetagOutline,
  IoSwapHorizontalOutline,
} from 'react-icons/io5'
import { getCategories } from '@/actions/data/category'
import { getAllEventsForAdmin } from '@/actions/data/event'
import { getEventTypes } from '@/actions/data/event-type'
import { getGifts } from '@/actions/data/gift'
import {
  getAdminGiftlists,
  getGiftlistOptionsForAdmin,
} from '@/actions/data/giftlist'
import { getAllPayoutsForAdmin } from '@/actions/data/payout'
import { getAllTransactionsForAdmin } from '@/actions/data/transaction'
import { getCurrentUser } from '@/actions/get-current-user'
import AdminCategoriesList from '@/components/admin/admin-categories-list'
import AdminEventTypesList from '@/components/admin/admin-event-types-list'
import AdminEventsList from '@/components/admin/admin-events-list'
import AdminGiftlistsList from '@/components/admin/admin-giftlists-list'
import AdminGiftsList from '@/components/admin/admin-gifts-list'
import AdminPayoutsList from '@/components/admin/admin-payouts-list'
import AdminTransactionsList from '@/components/admin/admin-transactions-list'
import EmptyState from '@/components/common/empty-state'
import DashboardTransactionsSkeleton from '@/components/skeletons/dashboard-transactions'
import { cn } from '@/lib/utils'

const TABS = [
  {
    value: 'transacciones',
    label: 'Transacciones',
    icon: IoSwapHorizontalOutline,
  },
  { value: 'retiros', label: 'Solicitudes de retiro', icon: IoCashOutline },
  { value: 'eventos', label: 'Eventos', icon: IoPeopleOutline },
  {
    value: 'tipos-de-evento',
    label: 'Tipos de evento',
    icon: IoCalendarOutline,
  },
  { value: 'categorias', label: 'Categorías', icon: IoPricetagOutline },
  { value: 'colecciones', label: 'Colecciones', icon: IoFolderOpenOutline },
  { value: 'regalos', label: 'Regalos', icon: IoGiftOutline },
] as const satisfies readonly { value: string; label: string; icon: IconType }[]

type AdminTab = (typeof TABS)[number]['value']

const DEFAULT_TAB: AdminTab = 'transacciones'

function parseTab(value: string | string[] | undefined): AdminTab {
  return TABS.some(tab => tab.value === value)
    ? (value as AdminTab)
    : DEFAULT_TAB
}

async function TransactionsPanel() {
  const transactions = await getAllTransactionsForAdmin()

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<IoSwapHorizontalOutline className="text-4xl sm:text-6xl" />}
        title="Sin transacciones"
        description="Todavía no hay transacciones en ningún evento"
      />
    )
  }

  return <AdminTransactionsList transactions={transactions} />
}

async function PayoutsPanel() {
  const payouts = await getAllPayoutsForAdmin()

  if (payouts.length === 0) {
    return (
      <EmptyState
        icon={<IoCashOutline className="text-4xl sm:text-6xl" />}
        title="Sin solicitudes de retiro"
        description="Todavía no hay solicitudes de retiro en ningún evento"
      />
    )
  }

  return <AdminPayoutsList payouts={payouts} />
}

async function EventsPanel() {
  const events = await getAllEventsForAdmin()

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<IoPeopleOutline className="text-4xl sm:text-6xl" />}
        title="Sin eventos"
        description="Todavía no hay eventos registrados"
      />
    )
  }

  return <AdminEventsList events={events} />
}

async function EventTypesPanel() {
  return <AdminEventTypesList eventTypes={await getEventTypes()} />
}

async function CategoriesPanel() {
  const [categories, eventTypes] = await Promise.all([
    getCategories(),
    getEventTypes(),
  ])

  return <AdminCategoriesList categories={categories} eventTypes={eventTypes} />
}

async function GiftlistsPanel() {
  const [adminGiftlists, gifts, categories, eventTypes] = await Promise.all([
    getAdminGiftlists(),
    getGifts({ searchParams: { isDefault: true } }),
    getCategories(),
    getEventTypes(),
  ])

  return (
    <AdminGiftlistsList
      giftlists={adminGiftlists}
      gifts={gifts}
      categories={categories}
      eventTypes={eventTypes}
    />
  )
}

async function GiftsPanel() {
  const [gifts, categories, giftlists, eventTypes] = await Promise.all([
    getGifts({ searchParams: { isDefault: true } }),
    getCategories(),
    getGiftlistOptionsForAdmin(),
    getEventTypes(),
  ])

  return (
    <AdminGiftsList
      gifts={gifts}
      categories={categories}
      giftlists={giftlists}
      eventTypes={eventTypes}
    />
  )
}

const PANELS: Record<AdminTab, () => Promise<JSX.Element>> = {
  transacciones: TransactionsPanel,
  retiros: PayoutsPanel,
  eventos: EventsPanel,
  'tipos-de-evento': EventTypesPanel,
  categorias: CategoriesPanel,
  colecciones: GiftlistsPanel,
  regalos: GiftsPanel,
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const activeTab = parseTab(searchParams?.tab)
  const Panel = PANELS[activeTab]

  return (
    <div className="container w-full h-full flex items-center flex-col gap-6 p-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black">Panel de staff</h1>
          <Link href="/admin/jobs" className="text-sm underline">
            Trabajos de importación
          </Link>
          <p className="text-textTertiary">
            Consultá todos los eventos, transacciones y solicitudes de retiro.
            Los cambios de estado quedan registrados con tu usuario.
          </p>
        </div>
      </div>

      <div className="w-full">
        <nav className="inline-flex max-w-full min-h-10 items-center justify-start gap-2 overflow-x-auto overflow-y-hidden rounded-md bg-muted p-1 text-muted-foreground sm:gap-3 sm:justify-center">
          {TABS.map(({ value, label, icon: Icon }) => (
            <Link
              key={value}
              href={value === DEFAULT_TAB ? '/admin' : `/admin?tab=${value}`}
              scroll={false}
              aria-current={value === activeTab ? 'page' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-borderDefault px-3 py-1.5 text-xs font-medium transition-all hover:bg-gray600 sm:text-sm',
                value === activeTab && 'bg-gray600 text-foreground shadow-sm'
              )}
            >
              <Icon className="text-lg" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          <Suspense
            key={activeTab}
            fallback={<DashboardTransactionsSkeleton />}
          >
            <Panel />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
