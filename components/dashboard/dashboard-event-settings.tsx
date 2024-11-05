import DashboardEventUserUpdateForm from '@/components/forms/dashboard/event-settings';
import DashboardEventSettingsForm from '@/components/forms/dashboard/event-settings';

export default function DashboardEventSettings() {
  return (
    <div className="w-full h-full flex justify-center items-center flex-col gap-8">
      <div className="w-full flex flex-col gap-4 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-black">Configuración General</h1>
        <p className="text-textTertiary">
          Define los detalles importantes de tu evento: establece la fecha,
          añade invitados y configura la información bancaria.
        </p>
      </div>

      <div className="w-full">
        <DashboardEventSettingsForm />
      </div>
    </div>
  );
}
