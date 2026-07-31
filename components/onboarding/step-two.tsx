'use client';

import StepTwoForm from '@/components/forms/onboarding/step-two';
import { useStepTwo } from '@/hooks/onboarding/use-step-two';
import { useOnboarding } from '@/hooks/use-onboarding';
import wedinIcon from '@/public/assets/w-icon.svg';
import { EventType } from '@prisma/client';
import Image from 'next/image';
import OnboardingStepper from './stepper';

export default function OnboardingStepTwo() {
  const {
    handleProfileUpdate,
    loading,
  } = useOnboarding();

  const {
    form,
    eventType,
    isValid,
    handleSubmit,
  } = useStepTwo({
    onSubmit: handleProfileUpdate,
  });

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      <Image
        src={wedinIcon}
        alt="wedin icon"
        width={78}
      />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-medium text-textSecondary">
          {eventType === EventType.WEDDING
            ? '¿Cómo se llaman los protagonistas del evento?'
            : '¿Cómo te llamas?'}
        </h1>

        <p className="text-secondary400">
          Este nombre será visible en tu página
          personalizada
        </p>
      </div>

      <StepTwoForm
        form={form}
        eventType={eventType}
        isValid={isValid}
        loading={loading}
        onSubmit={handleSubmit}
      />

      <OnboardingStepper step={2} />
    </div>
  );
}
