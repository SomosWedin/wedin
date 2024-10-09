import { getCurrentUser } from '@/actions/get-current-user';
import OnboardingControlller from '../components/controller';

export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();

  return <OnboardingControlller currentUser={currentUser} />;
}
