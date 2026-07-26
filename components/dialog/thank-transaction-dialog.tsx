'use client';

import { suggestThankYouMessage } from '@/actions/ai/suggest-thank-you-message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTransaction } from '@/hooks/dashboard/use-transaction';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@prisma/client';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const { loading, thankTransaction } = useTransaction();
  const { toast } = useToast();

  // Agradecer is one-time — once notes exist, this stays a disabled
  // "Agradecido" marker instead of reopening the dialog to edit it.
  if (transaction.notes) {
    return (
      <Button type="button" variant="outline" className="gap-2" size="sm" disabled>
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

  const handleSuggest = async () => {
    setSuggesting(true);
    const result = await suggestThankYouMessage(transaction.id);
    setSuggesting(false);

    if (!result.success) {
      toast({
        title: result.error ?? 'No se pudieron generar sugerencias',
        variant: 'destructive',
      });
      return;
    }

    setSuggestions(result.success);
  };

  const applySuggestion = (suggestion: string) => {
    setNotes(suggestion);
    setSuggestions([]);
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

        <div className="relative">
          <Textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Escribí tu mensaje de agradecimiento"
            className="min-h-32 resize-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-2 bottom-2 gap-2"
            onClick={handleSuggest}
            disabled={suggesting}
          >
            {suggesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Sugerir con IA</span>
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="p-3 text-xs sm:text-sm text-left rounded-md border transition-colors border-borderSecondary hover:border-primary hover:bg-gray-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 -mx-6 -mb-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={loading || !notes.trim()}
            onClick={handleSubmit}
          >
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
