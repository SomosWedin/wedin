import Link from 'next/link';
import { IoHeartOutline } from 'react-icons/io5';
import EmptyState from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

type CheckoutSuccessPageProps = {
  params: { slug: string };
};

export default function CheckoutSuccessPage({
  params,
}: CheckoutSuccessPageProps) {
  return (
    <div className="px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <EmptyState
        icon={<IoHeartOutline className="text-6xl text-wedinMain" />}
        title="¡Gracias por tu regalo!"
        description="Tu contribución fue registrada y los novios recibirán una notificación. Cuando el pago se confirme, se sumará automáticamente a la lista."
        action={
          <Button variant="success" asChild>
            <Link href={`/e/${params.slug}`}>Volver al sitio</Link>
          </Button>
        }
      />
    </div>
  );
}
