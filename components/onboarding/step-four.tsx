'use client';

import StepFourForm from '@/components/forms/onboarding/step-four';
import { useOnboarding } from '@/hooks/use-onboarding';
import wedinIcon from '@/public/assets/w-icon.svg';
import Image from 'next/image';
import OnboardingStepper from './stepper';

export default function OnboardingStepFour() {
  const {
    loading,
    handleEventDateUpdate,
  } = useOnboarding();

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      <Image
        src={wedinIcon}
        alt="wedin icon"
        width={78}
      />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-medium text-textSecondary">
          ¿Cuándo tendrá lugar este gran día?
        </h1>

        <p className="text-secondary400">
          Configura tu sitio web para esta fecha especial
        </p>
      </div>

      <StepFourForm
        loading={loading}
        onSubmit={handleEventDateUpdate}
      />

      <OnboardingStepper step={4} />
    </div>
  );
}
