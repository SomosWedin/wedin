import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { Toaster } from '@/components/ui/toaster'
import Provider from '@/utils/Provider'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wedin',
  description: 'Organize your wedding with Wedin',
  icons: {
    icon: '/assets/w-icon.svg',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
      <html lang="en">
        <body className={`${inter.className} antialiased sm:min-h-screen`}>
          <Toaster />
          <Provider>{children}</Provider>
        </body>
      </html>
    </SessionProvider>
  )
}
