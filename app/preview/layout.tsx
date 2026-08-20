import type { Metadata } from 'next'
import Image from 'next/image'
import { PreviewModeProvider } from '@/components/guest/preview-mode'
import ShareListButton from '@/components/guest/share-list-button'
import wedinLogo from '@/public/assets/w-logo.svg'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SitePreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <PreviewModeProvider>
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100">
          <div className="flex justify-between items-center px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <span className="flex gap-1 items-center text-wedinMain">
              <Image src={wedinLogo} alt="wedin" width={110} />
            </span>
            <ShareListButton />
          </div>
        </header>
        {children}
      </div>
    </PreviewModeProvider>
  )
}
