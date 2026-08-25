import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IoLogoWhatsapp } from 'react-icons/io5'
import { getCheckoutTransactions } from '@/actions/data/checkout'
import { getEventByUrl } from '@/actions/data/public-event'
import {
  buildWedinWhatsappLink,
  WEDIN_BANK_ACCOUNT,
} from '@/lib/wedin-bank-account'

type TransferPageProps = {
  params: { slug: string }
  searchParams?: { ref?: string }
}

export default async function TransferPage({
  params,
  searchParams,
}: TransferPageProps) {
  const transactionIds = searchParams?.ref?.split(',').filter(Boolean) ?? []

  if (transactionIds.length === 0) notFound()

  const event = await getEventByUrl(params.slug)

  if (!event) notFound()

  const transactions = await getCheckoutTransactions(transactionIds, event.id)

  if (transactions.length === 0) notFound()

  const total = transactions.reduce(
    (sum, transaction) => sum + (Number(transaction.amount) || 0),
    0
  )
  const orderReference = transactions[0].id.slice(-6).toUpperCase()

  return (
    <div className="flex justify-center px-4 py-6 sm:py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="p-4 sm:p-8 w-full max-w-md bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-center">
          Realizá la transferencia para completar la compra de tu regalo
        </h1>
        <p className="mb-8 text-center text-textTertiary text-sm">
          Ingresa a la aplicación o web de tu banco para realizar la
          transferencia
        </p>

        <div className="flex flex-col gap-4 items-center mb-6 text-center">
          <div>
            <p className="text-sm text-textTertiary">Monto</p>
            <p className="text-lg font-semibold">
              Gs. {total.toLocaleString('es-PY')}
            </p>
          </div>
          <div>
            <p className="text-sm text-textTertiary">Número de pedido</p>
            <p className="font-medium">{orderReference}</p>
          </div>
        </div>

        <div className="my-6 border-t border-gray-100" />

        <div className="flex flex-col gap-4 items-center mb-8 text-center">
          <div>
            <p className="text-sm text-textTertiary">Banco</p>
            <p className="font-medium">{WEDIN_BANK_ACCOUNT.bankName}</p>
          </div>
          <div>
            <p className="text-sm text-textTertiary">Número de cuenta</p>
            <p className="font-medium">{WEDIN_BANK_ACCOUNT.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-textTertiary">Nombre de la cuenta</p>
            <p className="font-medium">{WEDIN_BANK_ACCOUNT.accountHolder}</p>
          </div>
          <div>
            <p className="text-sm text-textTertiary">Documento RUC</p>
            <p className="font-medium">{WEDIN_BANK_ACCOUNT.ruc}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-center text-textTertiary">
          Cuando realices la transferencia, envíanos el comprobante o click
          abajo para ir al WhatsApp
        </p>

        <Link
          href={buildWedinWhatsappLink(total, orderReference)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-2 justify-center items-center py-3 w-full font-medium text-white bg-textPrimary rounded-lg transition-colors hover:bg-black"
        >
          <IoLogoWhatsapp className="text-lg" />
          Ir al WhatsApp de wedin
        </Link>
      </div>
    </div>
  )
}
