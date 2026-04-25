import { z } from "zod";

export const OrderSchema = z.object({
  id: z.string(),
  items: z.string(),
  address: z.string(),
  neighborhood: z.string(),
  preferred_date: z.string(),
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  status: z.enum(["pending", "routed", "completed"]),
  created_at: z.string(),
  telegram_thread_id: z.string(),
});

export type Order = z.infer<typeof OrderSchema>;
