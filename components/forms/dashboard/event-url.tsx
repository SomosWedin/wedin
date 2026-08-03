'use client'

import { Loader2, Pencil } from 'lucide-react'
import { FaCheck } from 'react-icons/fa6'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useEventUrl } from '@/hooks/dashboard/forms/use-event-url'
import { getConfiguredRootDomain } from '@/lib/event-domain'

type EventUrlFormProps = {
  eventId: string
  url: string
  onUrlUpdated: (url: string) => void
}

export default function EventUrlForm({
  eventId,
  url,
  onUrlUpdated,
}: EventUrlFormProps) {
  const { form, onSubmit, isDirty, isValid, loading } = useEventUrl({
    eventId,
    url,
    onUrlUpdated,
  })

  const rootDomain = getConfiguredRootDomain()

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-start gap-2"
      >
        <FormField
          control={form.control}
          name="eventUrl"
          render={({ field }) => (
            <FormItem className="w-full sm:w-64">
              <FormControl>
                <div className="flex w-full items-center rounded-md border border-input bg-white focus-within:ring-1 focus-within:ring-ring">
                  <Input
                    {...field}
                    placeholder="amelie-y-john"
                    aria-label="Subdominio del evento"
                    className="min-w-0 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />

                  <span className="whitespace-nowrap pr-2 text-sm text-textTertiary select-none">
                    .{rootDomain}
                  </span>

                  <Pencil className="mr-3 h-4 w-4 shrink-0 text-textTertiary" />
                </div>
              </FormControl>

              {isDirty && (
                <FormMessage className="font-normal text-red-600 text-xs" />
              )}
            </FormItem>
          )}
        />

        {isDirty && (
          <Button
            type="submit"
            variant="success"
            size="icon"
            disabled={loading || !isValid}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FaCheck className="text-lg" />
            )}
          </Button>
        )}
      </form>
    </Form>
  )
}
