'use client';

import logout from '@/actions/auth/logout';

export default function DashboardPage() {
  const handleLogout = async () => {
    await logout();
    // Optionally, you can add a redirect or other actions after logout
  };

  return (
    <div>
      <div>hello</div>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
