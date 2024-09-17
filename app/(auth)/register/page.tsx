import Link from "next/link";
import Image from "next/image";
import backgroundImg from "@/public/login-background.svg";
import logoImg from "@/public/w-logo.svg";
import SociaMediaLoginButton from '@/components/forms/auth/social-media-login-form';
import RegisterForm from "@/components/forms/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex w-full">
      <div className="hidden md:block w-2/6 h-screen ">
        <Image
          src={backgroundImg}
          alt="Login background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="w-4/6 p-10 flex flex-col items-center justify-center max-w-5xl m-auto gap-8">
        <div className="flex flex-col gap-6 items-center">
          <Image src={logoImg} alt="Logo" className="w-48" />
          <p className="text-3xl font-semibold text-center text-textPrimary sm:text-5xl">
            Vamos a crear tu cuenta
          </p>
        </div>

        <RegisterForm />

        <div className="flex items-center justify-center gap-2 w-full">
          <span className="w-64 border-b-2 border-borderSecondary" />
          <p className="text-gray-300">o</p>
          <span className="w-64 border-b-2 border-borderSecondary" />
        </div>

        <div className="flex items-center justify-center w-full">
          <SociaMediaLoginButton provider={'google'}  />
        </div>

        <div className="flex items-center justify-center gap-4 w-full text-sm">
          <p className="text-secondary-400">¿Ya tienes una cuenta?</p>
          <Link
            href="/register"
            className="flex justify-center items-center border border-borderDefault bg-gray600 rounded-md text-textSecondary font-medium px-4 py-2 hover:bg-borderDefault cursor-pointer transition-all duration-150"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
