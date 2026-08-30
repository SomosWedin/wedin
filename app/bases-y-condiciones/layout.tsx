import Image from 'next/image'
import Link from 'next/link'
import wedinLogo from '@/public/assets/w-logo.svg'

export default function TermsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="flex items-center px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <Link href="/" className="flex gap-1 items-center text-wedinMain">
            <Image src={wedinLogo} alt="wedin" width={110} />
          </Link>
        </div>
      </header>

      {children}
    </div>
  )
}
