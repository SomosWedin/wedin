import { getCurrentUser } from '@/actions/get-current-user';
import OnboardingStepManager from '@/components/onboarding/StepManager';

export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="h-screen flex items-center justify-center w-full p-6 sm:p-10">
      <OnboardingStepManager currentUser={currentUser} />
    </div>
  );
}
