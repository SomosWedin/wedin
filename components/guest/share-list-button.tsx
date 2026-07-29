'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { IoLinkOutline } from 'react-icons/io5';

export default function ShareListButton() {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Enlace copiado al portapapeles 🔗' });
    } catch (error) {
      toast({
        title: 'No pudimos copiar el enlace',
        description: 'Copiá la dirección desde la barra del navegador.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button variant="outline" className="gap-2" onClick={handleShare} size="sm">
      Compartir lista
      <IoLinkOutline className="text-lg" />
    </Button>
  );
}
