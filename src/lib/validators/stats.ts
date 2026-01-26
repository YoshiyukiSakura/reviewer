import { z } from 'zod'

export const statsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type StatsQueryInput = z.infer<typeof statsQuerySchema>