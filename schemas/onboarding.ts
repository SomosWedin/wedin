import { z, boolean } from 'zod';
import { EventType } from '@prisma/client';

export const StepTwoSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'Tu nombre no puede estar vacío' })
      .min(2, { message: 'Nombre muy corto' })
      .max(255, { message: 'Nombre muy largo' }),
    lastName: z
      .string()
      .min(1, { message: 'Tu apellido no puede estar vacío' })
      .min(2, { message: 'Apellido muy corto' })
      .max(255, { message: 'Apellido muy largo' }),
    partnerName: z.string().optional(),
    partnerLastName: z.string().optional(),
    eventType: z.nativeEnum(EventType),
  })
  .superRefine((data, ctx) => {
    // Check if the eventType is WEDDING
    if (data.eventType === EventType.WEDDING) {
      // Validate partnerName
      if (!data.partnerName || data.partnerName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: 'string',
          inclusive: true,
          message: 'Nombre muy corto',
          path: ['partnerName'],
        });
      }

      // Validate partnerLastName
      if (!data.partnerLastName || data.partnerLastName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: 'string',
          inclusive: true,
          message: 'Apellido muy corto',
          path: ['partnerLastName'],
        });
      }
    }
  });

export const StepThreeSchema = z.object({
  eventCountry: z.string().optional(),
  eventCity: z.string().optional(),
  isDecidingEventLocation: boolean(),
});

export const StepFourSchema = z.object({
  eventDate: z.date().optional(),
  isDecidingEventDate: boolean(),
});
