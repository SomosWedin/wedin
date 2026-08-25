import Image from 'next/image'
import Link from 'next/link'
import { IoGiftOutline } from 'react-icons/io5'
import EmptyState from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import wedinIcon from '@/public/assets/w-icon.svg'

export default function NotFound() {
  return (
    <div className="flex flex-col gap-8 justify-center items-center min-h-screen bg-white">
      <Link href="/" className="flex gap-1 items-center text-wedinMain">
        <Image src={wedinIcon} alt="wedin icon" width={46} />
        <h1 className="text-xl font-bold">wedin</h1>
      </Link>

      <EmptyState
        icon={<IoGiftOutline className="text-4xl sm:text-6xl" />}
        title="Página no encontrada"
        description="La página que buscás no existe o fue movida."
        action={
          <Link href="/">
            <Button variant="success">Volver al inicio</Button>
          </Link>
        }
      />
    </div>
  )
}
