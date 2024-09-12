import { Button } from '@/components/ui/button';
import { capitalizeFirstLetter } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

type AuthFormButtonProps = {
  variant?: string;
  label?: string;
  isLoading?: boolean;
  handleSignIn?: () => void;
};

export default function AuthFormButton({
  variant,
  label = 'Iniciar sesión',
  isLoading, // we use this because the login is using on submit and not action
  handleSignIn, // we use this because the login is using on submit and not action
}: AuthFormButtonProps) {
  if (variant === 'socialMediaLogin') {
    return (
      <Button
        onClick={handleSignIn}
        variant="socialMediaLogin"
        disabled={isLoading}
        type='submit'
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <FaGoogle />
            Iniciar sesión con {capitalizeFirstLetter(label)}
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      variant="login"
      className="rounded-lg"
      disabled={isLoading}
    >
      {label}
      {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
    </Button>
  );
}
