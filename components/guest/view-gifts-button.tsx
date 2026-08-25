'use client'

import { Button } from '@/components/ui/button'

export default function ViewGiftsButton() {
  const handleClick = () => {
    document
      .getElementById('lista-de-regalos')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Button
      variant="success"
      size="lg"
      className="mt-4 w-fit"
      onClick={handleClick}
    >
      Ver los regalos
    </Button>
  )
}
