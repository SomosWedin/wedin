import { FaChevronLeft } from 'react-icons/fa6'
import { Button } from '@/components/ui/button'

type OnboardingBackButtonProps = {
  onClick: () => void
  disabled?: boolean
}

export default function OnboardingBackButton({
  onClick,
  disabled,
}: OnboardingBackButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 items-center gap-2 font-normal text-secondary400"
    >
      <FaChevronLeft className="text-xs" />
      Atrás
    </Button>
  )
}
