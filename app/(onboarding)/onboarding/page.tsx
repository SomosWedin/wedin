import { getCurrentUser } from '@/actions/get-current-user';
import OnboardingControlller from '../components/controller';

export default async function OnboardingPage(){
  const currentUser = await getCurrentUser();

  return (
    <div className='h-screen flex items-center justify-center w-full p-6 sm:p-10'>
      <OnboardingControlller currentUser={currentUser} />
    </div>
  )
}
