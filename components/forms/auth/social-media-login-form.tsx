'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import AuthFormButton, { SocialProvider } from './auth-form-button'

type SocialMediaLoginButtonType = {
  provider: SocialProvider
  callbackUrl?: string
}
function SociaMediaLoginButton({
  provider,
  callbackUrl = '/',
}: SocialMediaLoginButtonType) {
  const [isLoading, setIsLoading] = useState(false)
  const handleSignIn = () => {
    setIsLoading(true)

    signIn(provider, { callbackUrl: callbackUrl })

    setIsLoading(false)
  }

  return (
    <AuthFormButton
      variant="socialMediaLogin"
      provider={provider}
      isLoading={isLoading}
      handleSignIn={handleSignIn}
    />
  )
}

export default SociaMediaLoginButton
