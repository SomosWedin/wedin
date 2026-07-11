'use client';

import Link from 'next/link';
import { Pencil, Loader2, ArrowUpRight } from 'lucide-react';
import { IoLinkOutline } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa6';
import type { Event } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useEventUrl } from '@/hooks/dashboard/use-event-url';
import { useToggleEventPublished } from '@/hooks/dashboard/use-toggle-event-published';
import { useToast } from '@/hooks/use-toast';

type DashboardHomeSiteLinkCardProps = {
  event: Event;
};

export default function DashboardHomeSiteLinkCard({
  event,
}: DashboardHomeSiteLinkCardProps) {
  const { toast } = useToast();

  const {
    form: urlForm,
    onSubmit: onUrlSubmit,
    isDirty: isUrlDirty,
    isValid: isUrlValid,
    loading: urlLoading,
  } = useEventUrl({ eventId: event.id, url: event.url });

  const { isPublished, loading: publishLoading, toggle } =
    useToggleEventPublished({
      eventId: event.id,
      isPublished: event.isPublished,
    });

  const handleShare = async () => {
    try {
      const guestUrl = `${window.location.origin}/e/${event.url}`;
      await navigator.clipboard.writeText(guestUrl);
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
    <div className="border border-borderDefault bg-gray-50 w-full rounded-lg px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-medium">Link de tu sitio web wedin</h2>
          <p className="text-sm text-textTertiary">
            Compartí este link con tus invitados
          </p>
        </div>

        <Form {...urlForm}>
          <form
            onSubmit={urlForm.handleSubmit(onUrlSubmit)}
            className="flex items-start gap-2"
          >
            <FormField
              control={urlForm.control}
              name="eventUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center w-full max-w-sm rounded-md border border-input bg-white focus-within:ring-1 focus-within:ring-ring">
                      <span className="pl-3 text-sm text-textTertiary select-none">
                        wedin.com/e/
                      </span>
                      <Input
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                      <Pencil className="w-4 h-4 mr-3 text-textTertiary shrink-0" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            {isUrlDirty && (
              <Button
                type="submit"
                variant="success"
                size="icon"
                disabled={urlLoading || !isUrlValid}
              >
                {urlLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FaCheck className="text-lg" />
                )}
              </Button>
            )}
          </form>
        </Form>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={isPublished}
            disabled={publishLoading}
            onCheckedChange={toggle}
          />
          <span className="font-medium">Web visible</span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            Copiar link de tu sitio
            <IoLinkOutline className="text-lg" />
          </Button>
          <Link href={`/e/${event.url}`} target="_blank" rel="noopener noreferrer">
            <Button variant="success" className="gap-2">
              Ver sitio web
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
