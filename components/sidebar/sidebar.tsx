'use client';

import { Button } from '@/components/ui/button';
import logout from '@/actions/auth/logout';
import Image from 'next/image';
import logoImg from '@/public/w-logo.svg';
import { FiHome } from 'react-icons/fi';
import { LuSparkles, LuList, LuSettings } from 'react-icons/lu';
import { IoGiftOutline } from 'react-icons/io5';
import { LuLogOut } from 'react-icons/lu';

export default function Sidebar() {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="w-72 border-r border-borderDefault min-h-screen px-4 py-10 flex flex-col justify-between">
      <div className="flex flex-col">
        <div className="w-full flex justify-center border-b border-gray500 pb-10">
          <Image src={logoImg} alt="wedin icon" width={176} />
        </div>

        <div className="flex flex-col gap-2 my-6">
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-gray500 transition-all cursor-pointer">
            <FiHome className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Inicio</h2>
          </div>
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-gray500 transition-all cursor-pointer">
            <LuSparkles className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">
              Presentación
            </h2>
          </div>
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-gray500 transition-all cursor-pointer">
            <LuList className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Mi lista</h2>
          </div>
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-gray500 transition-all cursor-pointer">
            <LuSettings className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Generales</h2>
          </div>

          <div className="border-b border-gray500 my-3"></div>

          <div className="flex items-center gap-4 pl-4 py-2.5 rounded-lg hover:bg-gray500 transition-all cursor-pointer">
            <IoGiftOutline className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">
              Regalos recibidos
            </h2>
          </div>
        </div>
      </div>
      <div>
        <Button variant="logout" onClick={handleLogout}>
          Cerrar sesión
          <LuLogOut className="text-lg" />
        </Button>
      </div>
    </div>
  );
}
