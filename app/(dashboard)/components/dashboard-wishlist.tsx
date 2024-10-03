import { FaCheck } from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/empty-state';
import { IoAdd } from 'react-icons/io5';
import { IoGiftOutline } from 'react-icons/io5';

export default function DashboardWishlist() {
  return (
    <div className="w-full h-screen flex justify-center items-center px-10 flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Mi lista de regalos</h1>
          <p className="text-textTertiary">
            Crea tu lista de regalos: elige lo que te gustaría recibir y
            organiza tus opciones para tus invitados.
          </p>
        </div>
        <Button variant="success" className="gap-2 !text-lg" size="lg">
          Agregar regalos
          <IoAdd className="text-2xl" />
        </Button>
      </div>

      <div>
        <EmptyState
          icon={<IoGiftOutline className="text-7xl" />}
          title="Sin regalos en tu lista"
          description="Todavía no tienes ningún regalo agregado, explorá la sección de regalos."
          action={
            <Button variant="outline" className="gap-2" >
              Agregar regalos
            </Button>
          }
        />
      </div>
    </div>
  );
}
