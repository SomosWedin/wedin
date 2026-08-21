import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  type AdminOtpValues,
  requestAdminOtp,
  verifyAdminOtp,
} from '@/actions/auth/admin-otp'
import { useToast } from '@/hooks/use-toast'
import { AdminOtpSchema } from '@/schemas/auth'

const RESEND_COOLDOWN_SECONDS = 60

export function useAdminOtp() {
  const { toast } = useToast()

  const router = useRouter()

  const [hasRequested, setHasRequested] = useState(false)

  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const form = useForm<AdminOtpValues>({
    resolver: zodResolver(AdminOtpSchema),
    defaultValues: {
      code: '',
    },
  })

  const requestMutation = useMutation({
    mutationFn: requestAdminOtp,

    onSuccess: result => {
      if ('error' in result) {
        toast({
          variant: 'destructive',
          description: result.error,
        })

        return
      }

      setHasRequested(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)

      toast({
        variant: 'success',
        description: result.success,
      })
    },

    onError: () => {
      toast({
        variant: 'destructive',
        description: 'Ocurrió un error. Intentá nuevamente.',
      })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyAdminOtp,

    onSuccess: result => {
      if ('error' in result) {
        form.setValue('code', '')

        toast({
          variant: 'destructive',
          description: result.error,
        })

        return
      }

      router.replace('/admin')
      router.refresh()
    },

    onError: () => {
      toast({
        variant: 'destructive',
        description: 'Ocurrió un error. Intentá nuevamente.',
      })
    },
  })

  const handleRequest = () => requestMutation.mutate()

  const handleVerify = (values: AdminOtpValues) =>
    verifyMutation.mutate({ code: values.code.trim() })

  return {
    form,
    hasRequested,
    cooldown,
    handleRequest,
    handleVerify,
    isRequesting: requestMutation.isPending,
    isVerifying: verifyMutation.isPending,
  }
}
