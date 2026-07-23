import Link from 'next/link';
import {
  IoCloseCircleOutline,
  IoHeartOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import EmptyState from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { getOrderStatus } from '@/lib/pagopar';
import prismaClient from '@/prisma/client';

type PagoparResultPageProps = {
  params: { hash: string };
};

// Needed because Pagopar's redirect URL is one fixed dashboard setting for
// the whole merchant account (templated only by $hash) — it can't be
// scoped per event/slug, and can't distinguish success from cancelled by
// URL alone. This page looks both up from the hash.
export default async function PagoparResultPage({
  params,
}: PagoparResultPageProps) {
  const transaction = await prismaClient.transaction.findFirst({
    where: { pagoparHash: params.hash },
    include: { event: true },
  });

  if (!transaction) {
    return (
      <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <EmptyState
          icon={<IoCloseCircleOutline className="text-6xl text-gray-400" />}
          title="No encontramos este pedido"
          description="El enlace no es válido o ya expiró."
          action={
            <Button variant="success" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const backHref = transaction.event.url ? `/e/${transaction.event.url}` : '/';

  // Webhook delivery can lag a couple of minutes behind the redirect per
  // Pagopar's own docs, so this can't just trust Transaction.status at
  // landing time — query the authoritative status directly.
  const status = await getOrderStatus(params.hash);

  if ('error' in status || (!status.success.pagado && !status.success.cancelado)) {
    return (
      <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <EmptyState
          icon={<IoTimeOutline className="text-6xl text-gray-400" />}
          title="Estamos confirmando tu pago"
          description="Puede demorar unos minutos. Te avisaremos apenas se confirme — no hace falta que vuelvas a intentarlo."
          action={
            <Button variant="success" asChild>
              <Link href={backHref}>Volver al sitio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (status.success.cancelado) {
    return (
      <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <EmptyState
          icon={<IoCloseCircleOutline className="text-6xl text-gray-400" />}
          title="El pago no se completó"
          description="Tu pago fue cancelado o rechazado. Podés intentar de nuevo cuando quieras."
          action={
            <Button variant="success" asChild>
              <Link href={backHref}>Volver al sitio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <EmptyState
        icon={<IoHeartOutline className="text-6xl text-wedinMain" />}
        title="¡Gracias por tu regalo!"
        description="Tu contribución fue registrada y los novios recibirán una notificación. Cuando el pago se confirme, se sumará automáticamente a la lista."
        action={
          <Button variant="success" asChild>
            <Link href={backHref}>Volver al sitio</Link>
          </Button>
        }
      />
    </div>
  );
}
