import Image from 'next/image'
import LoginForm from '@/components/forms/auth/login-form'
import SociaMediaLoginButton from '@/components/forms/auth/social-media-login-form'
import backgroundImg from '@/public/assets/login-background.webp'
import logoImg from '@/public/assets/w-logo.svg'

export default function LoginPage() {
  return (
    <div className="flex w-full">
      <div className="hidden md:block w-2/6 h-screen ">
        <Image
          src={backgroundImg}
          alt="Login background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="w-full sm:w-4/6 p-4 sm:p-10 flex flex-col items-center justify-center max-w-5xl m-auto gap-8">
        <div className="flex flex-col gap-6 items-center">
          <Image src={logoImg} alt="Logo" className="w-48" />
          <p className="text-3xl font-semibold text-center text-textPrimary sm:text-5xl">
            Bienvenido a wedin
          </p>
        </div>

        <LoginForm />

        <div className="flex items-center justify-center gap-2 w-full">
          <span className="w-64 border-b-2 border-borderSecondary" />
          <p className="text-gray-300">o</p>
          <span className="w-64 border-b-2 border-borderSecondary" />
        </div>

        <div className="flex items-center justify-center w-full">
          <SociaMediaLoginButton provider={'google'} />
        </div>
      </div>
    </div>
  )
}
