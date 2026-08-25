'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IoGiftOutline, IoLockClosedOutline } from 'react-icons/io5'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useCheckout } from '@/hooks/checkout/forms/use-checkout'
import { useCartStore } from '@/hooks/use-cart-store'
import { useStore } from '@/hooks/use-store'
import type { GuestCheckoutSchema } from '@/schemas/checkout'

type PaymentMethod = z.infer<typeof GuestCheckoutSchema>['paymentMethod']

const PAYMENT_METHODS: {
  value: PaymentMethod
  label: string
  description: string
}[] = [
  {
    value: 'CARD',
    label: 'Online con tarjeta',
    description: 'Pago inmediato con tarjeta de crédito o débito',
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Transferencia bancaria',
    description: 'Transferí y enviá el comprobante por WhatsApp',
  },
]

type CheckoutFormProps = {
  eventId: string
  eventSlug: string
}

export default function CheckoutForm({
  eventId,
  eventSlug,
}: CheckoutFormProps) {
  const router = useRouter()
  const cartStore = useCartStore(eventId)
  const cartItems = useStore(cartStore, state => state.items)

  const { loading, form, isValid, onSubmit } = useCheckout({
    eventId,
    eventSlug,
    cartItems: cartItems ?? [],
    onCheckoutStarted: () => cartStore.getState().clear(),
  })

  // `cartStore.persist` is undefined during SSR — zustand's persist
  // middleware silently disables itself server-side since `localStorage`
  // doesn't exist there, rather than throwing. Treat "no persist API" the
  // same as "not yet hydrated": that's the truthful state on the server,
  // and the client-side render (where `.persist` is always present) takes
  // over correctly once it mounts.
  const [hasHydrated, setHasHydrated] = useState(
    () => cartStore.persist?.hasHydrated() ?? false
  )

  useEffect(() => {
    if (!cartStore.persist) return
    if (cartStore.persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }
    return cartStore.persist.onFinishHydration(() => setHasHydrated(true))
  }, [cartStore])

  useEffect(() => {
    if (hasHydrated && cartItems && cartItems.length === 0 && !loading) {
      router.replace('/')
    }
  }, [hasHydrated, cartItems, router, loading])

  const paymentMethod = form.watch('paymentMethod')
  const [wantsMessage, setWantsMessage] = useState(false)

  if (!hasHydrated || !cartItems) return null
  if (cartItems.length === 0 && !loading) return null

  // Here
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const serviceFee = paymentMethod === 'CARD' ? Math.round(subtotal * 0.03) : 0
  const total = subtotal + serviceFee

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-8 mx-auto max-w-3xl md:grid-cols-2"
      >
        <div className="order-2 flex flex-col gap-4 md:order-1">
          <h2 className="text-lg font-semibold">Tus datos</h2>

          <FormField
            control={form.control}
            name="payerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre y apellido</FormLabel>
                <FormControl>
                  <Input placeholder="Tu nombre" {...field} />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          {paymentMethod === 'CARD' && (
            <FormField
              control={form.control}
              name="payerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" {...field} />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          )}

          {paymentMethod === 'CARD' && (
            <FormField
              control={form.control}
              name="payerDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cédula de identidad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567"
                      inputMode="numeric"
                      maxLength={10}
                      {...field}
                      onChange={e =>
                        field.onChange(e.target.value.replace(/\D/g, ''))
                      }
                    />
                  </FormControl>
                  <FormMessage className="font-normal text-red-600" />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="payerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0981234567"
                    inputMode="numeric"
                    maxLength={15}
                    {...field}
                    onChange={e =>
                      field.onChange(e.target.value.replace(/\D/g, ''))
                    }
                  />
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center cursor-pointer">
              <Checkbox
                checked={wantsMessage}
                onCheckedChange={checked => {
                  const next = checked === true
                  setWantsMessage(next)
                  if (!next) form.setValue('payerMessage', '')
                }}
              />
              <span className="text-sm">
                Te gustaría dejar un mensaje con tu regalo?
              </span>
            </div>

            {wantsMessage && (
              <FormField
                control={form.control}
                name="payerMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Deja un mensaje con tu regalo"
                        className="resize-none"
                        {...field}
                        maxLength={255}
                        onChange={e =>
                          field.onChange(
                            e.target.value.replace(
                              /[^a-zA-ZÀ-ÿ0-9\s.,!?'-]/g,
                              ''
                            )
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="font-normal text-red-600" />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="order-1 flex flex-col gap-6 md:order-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Tu pedido</h2>
            <div className="divide-y divide-gray-100">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-3 items-center py-3">
                  <div className="flex overflow-hidden justify-center items-center w-12 h-12 bg-gray-100 rounded-md shrink-0">
                    {item.giftImageUrl ? (
                      <Image
                        src={item.giftImageUrl}
                        alt={item.giftName}
                        className="object-cover w-full h-full"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <IoGiftOutline className="text-xl text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.giftName}</p>
                    {!item.isGroupGift && item.quantity > 1 && (
                      <p className="text-sm text-textTertiary">
                        {item.quantity} × Gs.{' '}
                        {Number(item.unitPrice).toLocaleString('es-PY')} c/u
                      </p>
                    )}
                  </div>
                  <p className="font-medium">
                    Gs. {Number(item.amount).toLocaleString('es-PY')}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="text-textTertiary">Cargo por servicio (3%)</span>

              <span className="font-semibold">
                Gs. {serviceFee.toLocaleString('es-PY')}
              </span>
            </div>

            <div className="flex justify-between items-center pt-4 mt-2 border-t">
              <span className="text-textTertiary">Total</span>

              <span className="text-xl font-semibold">
                Gs. {total.toLocaleString('es-PY')}
              </span>
            </div>
          </div>

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de pago</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="gap-3"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <label
                        key={method.value}
                        htmlFor={method.value}
                        className="flex gap-2 items-start cursor-pointer"
                      >
                        <RadioGroupItem
                          value={method.value}
                          id={method.value}
                          className="mt-1 border-gray-300 text-success focus-visible:ring-success data-[state=checked]:border-success"
                        />
                        <span>
                          <span className="block">{method.label}</span>
                          <span className="block text-sm text-textTertiary">
                            {method.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage className="font-normal text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          variant="success"
          className="order-3 gap-2 md:col-span-2 mt-6"
          disabled={loading || !isValid}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <IoLockClosedOutline />
          )}
          Confirmar compra
        </Button>
      </form>
    </Form>
  )
}
