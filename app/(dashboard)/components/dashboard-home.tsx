import { Progress } from '@/components/ui/progress';
import { FaCheck } from 'react-icons/fa6';
import { FaChevronRight } from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { IoEyeOutline } from 'react-icons/io5';

export default function DashboardHome() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center px-10 gap-8">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Inicio</h1>
        <p className="text-textTertiary">
          Configura tu página y sigue los pasos para tener todo listo para tu
          evento
        </p>
      </div>

      <div className="border border-borderDefault bg-gray-50 w-full rounded-lg px-6 py-8">
        <div className="flex justify-between items-center border-b border-gray-200 pb-6">
          <h2 className="text-xl font-medium">
            Completá los campos para publicar la página
          </h2>
          <div className="flex items-center">
            <p className="text-xs w-60">1 de 6 completado</p>
            <Progress value={26} />
          </div>
        </div>

        <div className="flex flex-col gap-5 mt-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <FaCheck className="text-2xl" />
              <p className="line-through text-textTertiary font-medium pl-3">
                Completá la presentación de tu evento
              </p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <div className="rounded-full w-6 pl-2">
                <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
              </div>
              <p className="font-medium pl-3">
                Cantidad de invitados al evento
              </p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <div className="rounded-full w-6 pl-2">
                <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
              </div>
              <p className="font-medium pl-3">Agregá al menos 1 regalo</p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <div className="rounded-full w-6 pl-2">
                <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
              </div>
              <p className="font-medium pl-3">
                Completa las configuraciones de tu evento
              </p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <div className="rounded-full w-6 pl-2">
                <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
              </div>
              <p className="font-medium pl-3">
                Completá tus datos bancarios para la transferencia
              </p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-5">
            <div className="flex items-center">
              <div className="rounded-full w-6 pl-2">
                <div className="rounded-full w-1.5 h-1.5 bg-black"></div>
              </div>
              <p className="font-medium pl-3">
                Escribí el link para el sitio web de tu lista
              </p>
            </div>
            <FaChevronRight className="text-lg" />
          </div>

          <div className="flex gap-6 mt-4">
            <Button className="gap-2 bg-gray600 w-44 hover:bg-gray500 transition-all">
              Ver demo
              <IoEyeOutline size={18} />
            </Button>
            <Button className="gap-2 bg-gray600 w-40" disabled>
              Ver sitio web
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
