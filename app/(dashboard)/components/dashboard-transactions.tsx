import EmptyState from '@/components/common/empty-state';
import { IoGiftOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { LuArrowUpRight } from 'react-icons/lu';

export default function DashboardTransactions() {
  return (
    <div className="w-full h-screen flex justify-center items-center px-10 flex-col gap-8">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black">Regalos recibidos</h1>
          <p className="text-textTertiary">
            Revisa los regalos que ya has recibido: lleva un registro y retira
            el efectivo cuando lo necesites.
          </p>
        </div>
        <Button variant="success" className="gap-2 !text-lg" size="lg">
          Gestionar retiro
          <LuArrowUpRight className="text-2xl" />
        </Button>
      </div>

      <div>
        <EmptyState
          icon={<IoGiftOutline className="text-7xl" />}
          title="Sin transacciones"
          description="Todavía no tienes regalos recibidos"
        />
      </div>
    </div>
  );
}
