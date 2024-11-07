'use client';

import React from 'react';
import { OnboardingProvider, useOnboarding } from './context';
import type { User } from '@prisma/client';
import StepOne from '@/components/onboarding/step-one';
import StepTwo from '@/components/onboarding/step-two';
import StepThree from '@/components/onboarding/step-three';
import StepFour from '@/components/onboarding/step-four';
import StepFive from '@/components/onboarding/step-five';
import StepSix from '@/components/onboarding/step-six';

type OnboardingControllerProps = {
  currentUser?: User | null;
};

// TODO: change controller naming to something more appropriate
export default function OnboardingController({
  currentUser,
}: OnboardingControllerProps) {
  return (
    <OnboardingProvider currentUser={currentUser}>
      <OnboardingSteps />
    </OnboardingProvider>
  );
}

function OnboardingSteps() {
  const { currentPage } = useOnboarding();

  return (
    <>
      {currentPage === 1 && <StepOne />}
      {currentPage === 2 && <StepTwo />}
      {currentPage === 3 && <StepThree />}
      {currentPage === 4 && <StepFour />}
      {currentPage === 5 && <StepFive />}
      {currentPage === 6 && <StepSix />}
    </>
  );
}
