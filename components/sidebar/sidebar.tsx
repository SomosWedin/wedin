// components/sidebar/sidebar.tsx

'use client';

import { Button } from '@/components/ui/button';
import logout from '@/actions/auth/logout';
import Image from 'next/image';
import logoImg from '@/public/assets/w-logo.svg';
import { FiHome } from 'react-icons/fi';
import { LuSparkles, LuList, LuSettings } from 'react-icons/lu';
import { IoGiftOutline } from 'react-icons/io5';
import { LuLogOut } from 'react-icons/lu';
import { DASHBOARD_ROUTES } from '@/utils/constants';
import { useGlobalContext } from '@/context/GlobalContext';

export default function Sidebar() {
  const { activeMenuItem, setActiveMenuItem } = useGlobalContext();

  const handleMenuItemClick = (name: string) => {
    setActiveMenuItem(name);
  };

  const handleLogout = async () => {
    await logout();
  };

  const getMenuItemClass = (name: string) => {
    return activeMenuItem === name
      ? 'bg-active'
      : 'hover:bg-active transition-all';
  };

  return (
    <aside className="w-72 border-r border-borderDefault min-h-screen px-4 py-10 flex flex-col justify-between">
      <div className="flex flex-col">
        <div className="w-full flex justify-center border-b border-gray500 pb-10">
          <Image src={logoImg} alt="wedin icon" width={176} />
        </div>

        <ul className="flex flex-col gap-2 my-6">
          <li
            className={`flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer ${getMenuItemClass(DASHBOARD_ROUTES.HOME)}`}
            onClick={() => handleMenuItemClick(DASHBOARD_ROUTES.HOME)}
          >
            <FiHome className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Inicio</h2>
          </li>
          <li
            className={`flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer ${getMenuItemClass(DASHBOARD_ROUTES.EVENT)}`}
            onClick={() => handleMenuItemClick(DASHBOARD_ROUTES.EVENT)}
          >
            <LuSparkles className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">
              Presentación
            </h2>
          </li>
          <li
            className={`flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer ${getMenuItemClass(DASHBOARD_ROUTES.WISHLIST)}`}
            onClick={() => handleMenuItemClick(DASHBOARD_ROUTES.WISHLIST)}
          >
            <LuList className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Mi lista</h2>
          </li>
          <li
            className={`flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer ${getMenuItemClass(DASHBOARD_ROUTES.SETTINGS)}`}
            onClick={() => handleMenuItemClick(DASHBOARD_ROUTES.SETTINGS)}
          >
            <LuSettings className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">Generales</h2>
          </li>

          <div className="border-b border-gray500 my-3"></div>

          <li
            className={`flex items-center gap-4 pl-4 py-2.5 rounded-lg cursor-pointer ${getMenuItemClass(DASHBOARD_ROUTES.TRANSACTIONS)}`}
            onClick={() => handleMenuItemClick(DASHBOARD_ROUTES.TRANSACTIONS)}
          >
            <IoGiftOutline className="text-xl" />
            <h2 className="font-medium text-textPrimary text-sm">
              Regalos recibidos
            </h2>
          </li>
        </ul>
      </div>
      <div>
        <Button variant="logout" onClick={handleLogout}>
          Cerrar sesión
          <LuLogOut className="text-lg" />
        </Button>
      </div>
    </aside>
  );
}
