'use client';

import type { User } from '@prisma/client';
import OnboardingStepOne from '@/components/onboarding/StepOne';
import OnboardingStepTwo from '@/components/onboarding/StepTwo';
import OnboardingStepThree from '@/components/onboarding/StepThree';
import OnboardingStepFour from '@/components/onboarding/StepFour';
import OnboardingStepFive from '@/components/onboarding/StepFive';
import StepSix from '@/components/onboarding/step-six';

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
      {currentPage === 2 && <OnboardingStepTwo eventType="WEDDING" />}
      {currentPage === 3 && <OnboardingStepThree />}
      {currentPage === 4 && <OnboardingStepFour />}
      {currentPage === 5 && <OnboardingStepFive />}
      {currentPage === 6 && <StepSix />}
    </>
  );
}
