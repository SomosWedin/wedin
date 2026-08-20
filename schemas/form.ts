import { EventType } from '@prisma/client'
import { type ZodType, z } from 'zod'

export const UpdateEventSettingsFormSchema = z
  .object({
    eventDate: z.date({
      required_error: 'Debes seleccionar una fecha',
      invalid_type_error: '¡Eso no es una fecha!',
    }),
    eventType: z.string(),
    eventUrl: z.string(),
    name: z
      .string()
      .min(1, { message: 'Tu nombre no puede estar vacío' })
      .min(3, { message: 'Tu nombre debe contener al menos 3 caracteres' })
      .max(255, { message: 'Nombre muy largo' }),
    lastName: z
      .string()
      .min(1, { message: 'Tu apellido no puede estar vacío' })
      .min(3, { message: 'Tu apellido debe contener al menos 3 caracteres' })
      .max(255, { message: 'Apellido muy largo' }),
    partnerName: z.string().nullable(),
    partnerLastName: z.string().nullable(),
    partnerEmail: z
      .string()
      .email({ message: 'Email de tu pareja no válido' })
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.eventType === EventType.WEDDING) {
      if (!data.partnerName) {
        ctx.addIssue({
          path: ['partnerName'],
          message:
            'El nombre de tu pareja es obligatorio para este tipo de evento',
          code: z.ZodIssueCode.custom,
        })
      } else if (data.partnerName.length < 3) {
        ctx.addIssue({
          path: ['partnerName'],
          message: 'El nombre de tu pareja debe contener al menos 3 caracteres',
          code: z.ZodIssueCode.custom,
        })
      }
      if (!data.partnerLastName) {
        ctx.addIssue({
          path: ['partnerLastName'],
          message:
            'El apellido de tu pareja es obligatorio para este tipo de evento',
          code: z.ZodIssueCode.custom,
        })
      } else if (data.partnerLastName.length < 3) {
        ctx.addIssue({
          path: ['partnerLastName'],
          message:
            'El apellido de tu pareja debe contener al menos 3 caracteres',
          code: z.ZodIssueCode.custom,
        })
      }
      if (!data.partnerEmail) {
        ctx.addIssue({
          path: ['partnerEmail'],
          message:
            'El email de tu pareja es obligatorio para este tipo de evento',
          code: z.ZodIssueCode.custom,
        })
      }
    }
  })

export const BankDetailsFormSchema = z.object({
  eventId: z.string(),
  bankName: z.string().min(1, { message: 'Debe seleccionar una entidad' }),
  accountHolder: z
    .string()
    .min(1, { message: 'Nombre y apellido no puede estar vacío' })
    .min(2, { message: 'Nombre y Apellido muy corto' })
    .max(255, { message: 'Nombre y Apellido muy largo' }),
  accountNumber: z
    .string()
    .min(1, { message: 'Número de cuenta no puede estar vacío' })
    .max(24, { message: 'Número de cuenta muy largo' }),
  accountType: z.string().min(1, { message: 'Debe seleccionar una moneda' }),
  identificationType: z
    .string()
    .min(1, { message: 'Debe seleccionar un documento' }),
  identificationNumber: z
    .string()
    .min(1, { message: 'Número de documento no puede estar vacío' })
    .max(12, { message: 'Número de documento muy largo' }),
  razonSocial: z.string().optional(),
  ruc: z.string().optional(),
})
export type BankDetailsFormType = z.infer<typeof BankDetailsFormSchema>

export const EventCoverFormSchema = z.object({
  coverMessage: z
    .string()
    .min(1, { message: 'El mensaje para tus invitados no puede estar vacío' })
    .min(3, {
      message:
        'El mensaje para tus invitados debe contener al menos 3 caracteres',
    })
    .max(255, {
      message:
        'El mensaje para tus invitados debe contener un máximo de 255 caracteres',
    }),
})

export const GiftFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'El nombre del regalo no puede estar vacío' })
    .max(60, { message: 'El nombre del regalo es demasiado largo' }),
  categoryId: z.string().min(1, { message: 'Debes seleccionar una categoría' }),
  price: z
    .string()
    .min(4, { message: 'Precio tiene que ser mayor a 999 guaranies' })
    .refine(value => Number(value) <= 99999999, {
      message: 'El precio no puede ser mayor de PYG 99,999,999',
    }),
  isDefault: z.boolean().default(false),
  sourceGiftId: z.string(),
  isEditedVersion: z.boolean().default(false),
  eventId: z.string().min(1, { message: 'No se encontro un event ID' }),

  image: z.any().optional() as ZodType<File>,
  imageUrl: z.string(),

  wishlistId: z.string().min(1, { message: 'No se encontro un wishlist ID' }), // wishlistGiftPostSchema
  isFavoriteGift: z.boolean().default(false), // wishlistGiftPostSchema
  isGroupGift: z.boolean().default(false), // wishlistGiftPostSchema
  quantity: z.coerce // wishlistGiftPostSchema
    .number()
    .int({ message: 'Debe ser entero' })
    .min(1, { message: 'Mínimo 1' })
    .max(20, { message: 'Máximo 20' })
    .default(1),
})

// We want to ignore the imageUrl field when creating/editing a gift
export const GiftPostSchema = GiftFormSchema.omit({ image: true })

export const GiftEditSchema = GiftPostSchema.pick({
  name: true,
  categoryId: true,
  price: true,
  imageUrl: true,
})

export const GiftCreateSchema = GiftPostSchema.pick({
  name: true,
  categoryId: true,
  price: true,
  isDefault: true,
  isEditedVersion: true,
  sourceGiftId: true,
  eventId: true,
  imageUrl: true,
})

export const WishlistGiftCreateSchema = z.object({
  wishlistId: z.string().min(1, { message: 'No se encontro un wishlist ID' }),
  eventId: z.string().min(1, { message: 'No se encontro un event ID' }),
  giftId: z.string().min(1, { message: 'No se encontro un gift ID' }),
  isFavoriteGift: z.boolean().default(false),
  isGroupGift: z.boolean().default(false),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
})

export const WishlistGiftsCreateSchema = z.object({
  wishlistId: z.string().min(1, { message: 'No se encontro un wishlist ID' }),
  giftIds: z.array(z.string().min(1, { message: 'No se encontro un gift ID' })),
  eventId: z.string().min(1, { message: 'No se encontro un event ID' }),
})

export const WishlistGiftEditSchema = z.object({
  wishlistGiftId: z.string().min(1, { message: 'No se encontro un ID' }),
  wishlistId: z.string().min(1, { message: 'No se encontro un wishlist ID' }),
  giftId: z.string().min(1, { message: 'No se encontro un gift ID' }),
  isFavoriteGift: z.boolean().default(false),
  isGroupGift: z.boolean().default(false),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
})

export const WishlistGiftDeleteSchema = z.object({
  wishlistId: z.string().min(1, { message: 'No se encontro un wishlist ID' }),
  giftId: z.string().min(1, { message: 'No se encontro un gift ID' }),
})

export const WishlistGiftReceivedToggleSchema = z.object({
  wishlistGiftId: z.string().min(1, { message: 'No se encontro un ID' }),
  isManuallyReceived: z.boolean(),
})

export const TransactionCreateSchema = z.object({
  amount: z
    .string()
    .min(4, { message: 'El precio debe ser mayor a 999 guaraníes' })
    .refine(value => Number(value) <= 99999999, {
      message: 'El precio no puede ser mayor de PYG 99,999,999',
    }),
})

// Define the TransactionStatus enum to match your Prisma schema
const TransactionStatus = z.enum([
  'OPEN',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
])

export const TransactionEditSchema = z.object({
  status: TransactionStatus,
  notes: z.string().optional(),
})

// Define the PayoutStatus enum to match your Prisma schema
const PayoutStatus = z.enum([
  'REQUESTED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
])

export const PayoutEditSchema = z.object({
  status: PayoutStatus,
})

export const TransactionStatusLogUpdateSchema = z.object({
  transaction: z.object({
    id: z.string().min(1, { message: 'No se encontró un ID de transacción' }),
    status: TransactionStatus, // This is the previous status
  }),
  status: TransactionStatus, // This is the new status
  changedById: z
    .string()
    .min(1, { message: 'No se encontró un ID de usuario' }),
  changedAt: z.string().transform(str => new Date(str)), // Ensure changedAt is a valid Date
})

// Reserved so an event slug can never collide with a real subdomain if we
// move guest sites from /e/{eventUrl} to {eventUrl}.wedin.app later.
const RESERVED_EVENT_URLS = [
  'www',
  'home',
  'landing',
  'app',
  'api',
  'admin',
  'dashboard',
  'mail',
  'ftp',
  'blog',
  'help',
  'support',
  'status',
  'cdn',
  'assets',
  'static',
  'img',
  'images',
  'docs',
  'staging',
  'dev',
  'test',
  'ns1',
  'ns2',
  'smtp',
  'webmail',
  'autodiscover',
  'cpanel',
  'shop',
  'store',
  'login',
  'register',
  'auth',
  'null',
  'undefined',
  'wedin',
  'wedin-staging',
  'send',
  'resend',
]

export const EventUrlFormSchema = z.object({
  eventId: z.string(),
  eventUrl: z
    .string()
    .min(1, { message: 'La dirección de tu evento no puede estar vacío' })
    .min(3, {
      message: 'La dirección de tu evento debe contener al menos 3 caracteres',
    })
    .max(63, {
      message:
        'La dirección de tu evento debe contener un máximo de 63 caracteres',
    })
    .transform(value => value.toLowerCase())
    .refine(value => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(value), {
      message:
        'La dirección de tu evento solo puede contener letras, números y guiones, y no puede empezar ni terminar con un guión',
    })
    .refine(value => !RESERVED_EVENT_URLS.includes(value), {
      message: 'Esa dirección está reservada, elegí otra.',
    }),
})

export const EventCoverImageFormSchema = z.object({
  eventId: z.string(),
  eventCoverImage: z.any().nullable() as ZodType<File>,
  eventCoverImageUrl: z.string(),
})

export const EventCoverMessageFormSchema = z.object({
  eventId: z.string(),
  eventCoverMessage: z
    .string()
    .min(1, { message: 'El mensaje para tus invitados no puede esta vacío' })
    .min(3, {
      message:
        'El mensaje para tus invitados debe contener al menos 3 caracteres',
    })
    .max(255, {
      message:
        'El mensaje para tus invitados debe contener un máximo de 255 caracteres',
    }),
})

export const EventDateFormSchema = z.object({
  eventId: z.string(),
  eventDate: z.date().nullable(),
})

const giftAmountSchema = z
  .string()
  .regex(/^\d{1,3}(\d{3})*$/, { message: 'Formato inválido' }) // Ensure the format allows commas
  .refine(val => parseInt(val.replace(/,/g, ''), 10) >= 99999, {
    message: 'El monto no puede ser menor a Gs. 99,999',
  })
  .refine(val => parseInt(val.replace(/,/g, ''), 10) <= 9999999, {
    message: 'El monto no puede ser mayor de Gs. 9,999,999',
  })

export const GiftAmountsFormSchema = z.object({
  eventId: z.string(),
  giftAmount1: giftAmountSchema,
  giftAmount2: giftAmountSchema,
  giftAmount3: giftAmountSchema,
  giftAmount4: giftAmountSchema,
})
