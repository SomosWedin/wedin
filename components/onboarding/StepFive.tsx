import Image from 'next/image';
import OnboardingStepper from './Stepper';
import wedinIcon from '@/public/assets/w-icon.svg';
import { Button } from '@/components/ui/button';
import { CiSettings } from 'react-icons/ci';
import { IoGiftOutline } from 'react-icons/io5';
import { PiBank } from 'react-icons/pi';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingStepFive() {
  const { loading, handleCompleteOnboarding } = useOnboarding();

  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¡Todo listo para empezar!
        </h1>
        <p className="text-secondary400">
          Sigue los siguientes pasos para personalizar tu sitio
        </p>
      </div>

      <div className="bg-gray50 rounded-xl px-6 py-2 flex flex-col">
        <div className="flex items-center gap-3 py-5 border-b border-borderDefault">
          <CiSettings className="text-primary400 text-3xl" />
          <h2 className="text-gray300 text-sm sm:text-lg">
            Completá más datos de tu evento para comunicarlo en tu web
          </h2>
        </div>
        <div className="flex items-center gap-4 py-5 border-b border-borderDefault">
          <IoGiftOutline className="text-primary400 text-2xl" />
          <h2 className="text-gray300 text-sm sm:text-lg">
            Armá una lista de los regalos que querés recibir y compartí el link
          </h2>
        </div>
        <div className="flex items-center gap-4 py-5">
          <PiBank className="text-primary400 text-2xl" />
          <h2 className="text-gray300 text-sm sm:text-lg">
            Completá tus datos bancarios y retirá la recaudación
          </h2>
        </div>
      </div>

      <Button
        variant="success"
        className="w-72 mt-4"
        onClick={() => handleCompleteOnboarding()}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalizar'}
      </Button>

      <OnboardingStepper step={5} />
    </div>
  );
}
