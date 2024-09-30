import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IoIosList } from "react-icons/io";
import { TbCurrencyDollar } from "react-icons/tb";

export default function DashboardSettings() {
  return (
    <div className="w-full h-screen flex justify-center items-center px-10 flex-col gap-8">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Configuraciones</h1>
        <p className="text-textTertiary">
          Define los detalles importantes de tu evento: establece la fecha,
          añade invitados y configura la información bancaria.
        </p>
      </div>

      <div className="flex items-start w-full">
        <Tabs defaultValue="account" className="w-[400px]">
          <TabsList className="gap-4">
            <TabsTrigger value="general">
              <IoIosList className="text-xl" />
              Configuración General
            </TabsTrigger>
            <TabsTrigger value="bank">
              <TbCurrencyDollar className="text-xl" />
              Configuración bancaria
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            general config about your event and user
          </TabsContent>
          <TabsContent value="bank">
            bank config about your event
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
