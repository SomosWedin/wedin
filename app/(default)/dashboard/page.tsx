'use client';

import logout from '@/actions/auth/logout';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const handleLogout = async () => {
    await logout();
    // Optionally, you can add a redirect or other actions after logout
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-10">
      <div>dashboard</div>
      <Button variant="destructive" onClick={handleLogout} className='bg-red-500 text-white hover:opacity-80 transition-all font-bold'>Logout</Button>
    </div>
  );
}
