import { z } from 'zod'

export const CoverMessageSuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(1).max(255)).length(3),
})

export const ThankYouSuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(1).max(500)).length(3),
})
