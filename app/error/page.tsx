import Image from 'next/image'
import Link from 'next/link'
import { IoAlertCircleOutline } from 'react-icons/io5'
import EmptyState from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import wedinIcon from '@/public/assets/w-icon.svg'

// Target of NextAuth's `pages.error` (auth.ts) — reached when an auth
// failure hits NextAuth's own redirect rather than the app's custom
// login() server action (actions/auth/login.ts), which catches AuthError
// before it ever gets here. In practice this is OAuth failures (e.g.
// Google sign-in), not a wrong password on the credentials form.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'Ese email ya está registrado con otro método de inicio de sesión.',
  AccessDenied: 'No tenés permiso para acceder con esa cuenta.',
  Configuration: 'Hubo un problema con la configuración de acceso.',
  Verification:
    'El enlace de verificación venció o ya fue usado. Asegurese que fue el ulitmo email enviado',
}

const DEFAULT_MESSAGE = 'Ocurrió un error al iniciar sesión.'

type ErrorPageProps = {
  searchParams?: { error?: string }
}

export default function ErrorPage({ searchParams }: ErrorPageProps) {
  const description =
    (searchParams?.error && ERROR_MESSAGES[searchParams.error]) ||
    DEFAULT_MESSAGE

  return (
    <div className="flex flex-col gap-8 justify-center items-center min-h-screen bg-white">
      <Link href="/" className="flex gap-1 items-center text-wedinMain">
        <Image src={wedinIcon} alt="wedin icon" width={46} />
        <h1 className="text-xl font-bold">wedin</h1>
      </Link>

      <EmptyState
        icon={<IoAlertCircleOutline className="text-6xl" />}
        title="No pudimos iniciar tu sesión"
        description={description}
        action={
          <Link href="/login">
            <Button variant="success">Volver a intentar</Button>
          </Link>
        }
      />
    </div>
  )
}
