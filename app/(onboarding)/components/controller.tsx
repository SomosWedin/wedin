'use client';

import { useState } from 'react';
import type { User } from '@prisma/client';
import StepOne from './step-one';
import StepTwo from './step-two';
import StepThree from './step-three';
import StepFour from './step-four';
import StepFive from './step-five';

type OnboardingControlllerProps = {
  currentUser?: User | null;
};

export default function OnboardingControlller({
  currentUser,
}: OnboardingControlllerProps) {
  const [currentPage, setCurrentPage] = useState(
    currentUser?.onboardingStep || 1
  );

  return (
    <>
      {currentPage === 1 && <StepOne />}

      {currentPage === 2 && <StepTwo />}

      {currentPage === 3 && <StepThree />}

      {currentPage === 4 && <StepFour />}

      {currentPage === 5 && <StepFive />}
    </>
  );
}
