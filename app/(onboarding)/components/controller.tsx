'use client';

import React from 'react';
import { OnboardingProvider, useOnboarding } from './context';
import type { User } from '@prisma/client';
import StepOne from './step-one';
import StepTwo from './step-two';
import StepThree from './step-three';
import StepFour from './step-four';
import StepFive from './step-five';
import StepSix from './step-six';

type OnboardingControllerProps = {
  currentUser?: User | null;
};


// TODO: change controller naming to something more appropriate
export default function OnboardingController({ currentUser }: OnboardingControllerProps) {
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
