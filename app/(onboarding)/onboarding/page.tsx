import { getCurrentUser } from '@/actions/get-current-user';
import OnboardingStepper from '../components/stepper';

export default async function OnboardingPage(){
  const currentUser = await getCurrentUser();

  return (
    <div className='h-screen flex items-center justify-center w-full p-6 sm:p-10'>
      <OnboardingStepper currentUser={currentUser} />
    </div>
  )
}
