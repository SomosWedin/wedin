'use client';

import { useState } from 'react';
import type { User } from '@prisma/client';
import StepOne from './step-one';
import StepTwo from './step-two';

type OnboardingStepperProps = {
  currentUser?: User | null;
};

export default function OnboardingStepper({
  currentUser,
}: OnboardingStepperProps) {
  const [currentPage, setCurrentPage] = useState(
    currentUser?.onboardingStep || 1
  );

  return (
    <>
      {currentPage === 1 && <StepOne />}

      {currentPage === 2 && <StepTwo />}

      {currentPage === 3 && 'step 3'}

      {currentPage === 4 && 'step 4'}

      {currentPage === 5 && 'step 5'}
    </>
  );
}
