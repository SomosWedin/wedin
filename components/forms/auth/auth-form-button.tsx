import { Button } from '@/components/ui/button';
import { capitalizeFirstLetter } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaApple, FaFacebookF, FaGoogle } from 'react-icons/fa';

export type SocialProvider = 'google' | 'facebook' | 'apple';

type AuthFormButtonProps = {
  variant?: string;
  label?: string;
  provider?: SocialProvider;
  isLoading?: boolean;
  handleSignIn?: () => void;
};

const providerIcons: Record<SocialProvider, IconType> = {
  google: FaGoogle,
  facebook: FaFacebookF,
  apple: FaApple,
};

export default function AuthFormButton({
  isLoading, // we use this because the login is using on submit and not action
  label = 'Iniciar sesión',
  provider,
  variant,
  handleSignIn, // we use this because the login is using on submit and not action
}: AuthFormButtonProps) {
  if (variant === 'socialMediaLogin' && provider) {
    const ProviderIcon = providerIcons[provider];

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
            <ProviderIcon aria-hidden="true" />
            Iniciar sesión con {capitalizeFirstLetter(provider)}
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      variant="success"
      className="rounded-lg"
      disabled={isLoading}
    >
      {label}
      {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
    </Button>
  );
}
