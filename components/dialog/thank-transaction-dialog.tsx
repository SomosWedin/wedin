'use client';

import { useState } from 'react';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTransaction } from '@/hooks/dashboard/use-transaction';
import type { Transaction } from '@prisma/client';

type ThankTransactionDialogProps = {
  transaction: Transaction;
  payerName: string;
};

export default function ThankTransactionDialog({
  transaction,
  payerName,
}: ThankTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(`¡Muchas gracias, ${payerName}! 💚`);
  const { loading, thankTransaction } = useTransaction();

  // Agradecer is one-time — once notes exist, this stays a disabled
  // "Agradecido" marker instead of reopening the dialog to edit it.
  if (transaction.notes) {
    return (
      <Button type="button" variant="outline" className="gap-2" disabled>
        <IoHeart className="text-base" />
        Agradecido
      </Button>
    );
  }

  const handleSubmit = async () => {
    const response = await thankTransaction(transaction.id, {
      status: transaction.status,
      notes,
    });

    if (!response.error) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2" size="sm">
          <IoHeartOutline className="text-base" />
          Agradecer
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Agradecer a {payerName}</DialogTitle>
        </DialogHeader>

        <Textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          rows={4}
          placeholder="Escribí tu mensaje de agradecimiento"
        />

        <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={loading || !notes.trim()}
            onClick={handleSubmit}
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
