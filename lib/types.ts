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

// Saved route for custom map visualization
export const SavedRouteSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  driver_label: z.string(),
  orders: z.array(OrderSchema),
  // Coordinates for map center
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type SavedRoute = z.infer<typeof SavedRouteSchema>;
