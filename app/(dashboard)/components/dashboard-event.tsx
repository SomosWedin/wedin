import { Button } from '@/components/ui/button';
import { CiImageOn } from 'react-icons/ci';
import { Textarea } from '@/components/ui/textarea';
import { MdOutlineFileUpload } from 'react-icons/md';
import { RxCross2 } from "react-icons/rx";
import { FaCheck } from 'react-icons/fa6';

export default function DashboardEvent() {
  return (
    <div className="w-full h-screen flex justify-center items-center px-10 flex-col gap-8">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Presentación</h1>
        <p className="text-textTertiary">
          Haz que tu evento brille: sube fotos y cuenta de qué se trata, para
          que tus invitados se emocionen.
        </p>
      </div>

      <div className="w-full flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200 pb-10">
        <div className="w-full sm:w-1/2 flex flex-col gap-2">
          <h2 className="text-xl font-medium">Fotos</h2>
          <p className="text-textTertiary">
            Puedes subir hasta 6 fotos horizontales, con un peso máximo de 40 mb
            cada uno
          </p>
        </div>
        <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
          <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
            <div className="w-16 h-24 bg-gray-50 border-2 border-borderSecondary border-dashed rounded-md flex items-center justify-center">
              <CiImageOn className="text-gray-400 text-3xl" />
            </div>
          </div>

          <Button variant="success" className="gap-2">
            Subir imagen
            <MdOutlineFileUpload className="text-xl" />
          </Button>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row items-center gap-6">
        <div className="w-full sm:w-1/2 flex flex-col gap-2">
          <h2 className="text-xl font-medium">Mensaje de bienvenida</h2>
          <p className="text-textTertiary">
            Escribe un mensaje de bienvenida para tus invitados, puedes escribir
            hasta 200 letras
          </p>
        </div>
        <div className="w-full sm:w-1/2 flex flex-col gap-6 items-end">
          <div className="w-full max-w-sm">
            <Textarea placeholder="Escribe un mensaje de bienvenida" />
            </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              Descartar
              <RxCross2 className="text-xl" />
            </Button>
            <Button variant="success" className="gap-2">
              Guardar
              <FaCheck className="text-lg" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
