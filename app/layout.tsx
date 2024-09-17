import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import Provider from '@/utils/Provider';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wedin',
  description: 'Organize your wedding with Wedin',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <html lang="en">
        <body className={`${inter.className} antialiased sm:min-h-screen`}>
          <Toaster />
          <Provider>{children}</Provider>
        </body>
      </html>
    </SessionProvider>
  );
}
