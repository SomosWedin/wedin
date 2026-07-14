'use client';

import type { User } from '@prisma/client';
import OnboardingStepOne from '@/components/onboarding/step-one';
import OnboardingStepTwo from '@/components/onboarding/step-two';
import OnboardingStepThree from '@/components/onboarding/step-three';
import OnboardingStepFour from '@/components/onboarding/step-four';
import OnboardingStepFive from '@/components/onboarding/step-five';
import OnboardingStepSix from '@/components/onboarding/step-six';

type OnboardingStepManagerProps = {
  currentUser: User;
};

export default function OnboardingStepManager({
  currentUser,
}: OnboardingStepManagerProps) {
  const currentPage = currentUser?.onboardingStep || 1;

  return (
    <>
      {currentPage === 1 && <OnboardingStepOne />}
      {currentPage === 2 && <OnboardingStepTwo />}
      {currentPage === 3 && <OnboardingStepThree />}
      {currentPage === 4 && <OnboardingStepFour />}
      {currentPage === 5 && <OnboardingStepFive />}
      {currentPage === 6 && <OnboardingStepSix />}
    </>
  );
}
