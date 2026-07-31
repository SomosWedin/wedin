'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRequestPayoutDialog } from '@/hooks/dialog/forms/use-request-payout-dialog';
import RequestPayoutForm from '@/components/forms/dialog/request-payout';

type RequestPayoutDialogProps = {
  eventId: string;
  balance: number;
};

export default function RequestPayoutDialog({
  eventId,
  balance,
}: RequestPayoutDialogProps) {
  const {
    form,
    open,
    loading,
    isValid,
    handleOpenChange,
    handleSubmit,
  } = useRequestPayoutDialog({
    eventId,
    balance,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="success"
          className="gap-2"
          disabled={balance <= 0}
        >
          Retirar efectivo
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event =>
          event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>
            Retirar efectivo
          </DialogTitle>
        </DialogHeader>

        <RequestPayoutForm
          form={form}
          balance={balance}
          loading={loading}
          isValid={isValid}
          onSubmit={handleSubmit}
          onCancel={() =>
            handleOpenChange(false)
          }
        />
      </DialogContent>
    </Dialog>
  );
}
