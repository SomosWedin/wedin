import Link from 'next/link';
import Image from 'next/image';
import wedinIcon from '@/public/assets/w-icon.svg';
import ShareListButton from '@/components/guest/share-list-button';

export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="flex justify-between items-center px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <Link href="/" className="flex gap-1 items-center text-wedinMain">
            <Image src={wedinIcon} alt="wedin icon" width={36} />
            <span className="text-xl font-bold">wedin</span>
          </Link>
          <ShareListButton />
        </div>
      </header>
      {children}
    </div>
  );
}
