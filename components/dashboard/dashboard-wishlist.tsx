import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/empty-state';
import { IoAdd } from 'react-icons/io5';
import { IoGiftOutline } from 'react-icons/io5';
import Link from 'next/link';

export default function DashboardWishlist() {
  return (
    <div className="w-full h-full flex items-center flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Mi lista de regalos</h1>
          <p className="text-textTertiary">
            Crea tu lista de regalos: elige lo que te gustaría recibir y
            organiza tus opciones para tus invitados.
          </p>
        </div>
        <Link href="/gifts">
          <Button variant="success" className="gap-2">
            Agregar regalos
            <IoAdd className="text-2xl" />
          </Button>
        </Link>
      </div>

      <div>
        <EmptyState
          icon={<IoGiftOutline className="text-6xl" />}
          title="Sin regalos en tu lista"
          description="Todavía no tienes ningún regalo agregado, explorá la sección de regalos."
          action={
            <Link href="/gifts">
              <Button variant="outline" className="gap-2">
                Agregar regalos
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
