import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";
import type { Order } from "./types";

export async function saveOrder(
  params: Omit<Order, "id" | "status" | "created_at" | "telegram_thread_id">,
  threadId?: string
): Promise<Order> {
  const order: Order = {
    ...params,
    id: nanoid(8),
    status: "pending",
    created_at: new Date().toISOString(),
    telegram_thread_id: threadId || "",
  };
  await kv.hset(`order:${order.id}`, order);
  await kv.sadd("orders:pending", order.id);
  return order;
}

export async function getPendingOrders(): Promise<Order[]> {
  // Código original - pedidos reales de KV (pending + routed)
  const pendingIds = (await kv.smembers("orders:pending")) as string[];
  const routedIds = (await kv.smembers("orders:routed")) as string[];

  const allIds = [...pendingIds, ...routedIds];

  const orders = await Promise.all(
    allIds.map((id) => kv.hgetall(`order:${id}`))
  );

  // Ordenar por fecha de creación (más reciente primero)
  return (orders.filter(Boolean) as Order[]).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Datos de prueba hardcodeados - TEMPORAL PARA DESARROLLO (comentado)
  /*
  const mockOrders: Order[] = [
    {
      id: "mock001",
      items: "Heladera vieja, lavarropas roto",
      address: "8 de Octubre 2456",
      neighborhood: "La Comercial",
      preferred_date: "Hoy",
      client_name: "María González",
      client_phone: "099 123 456",
      status: "pending",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Hace 2 horas
      telegram_thread_id: "thread_001",
    },
    {
      id: "mock002",
      items: "Chapas de zinc, tubos de hierro",
      address: "Av. Italia 3215",
      neighborhood: "Pocitos",
      preferred_date: "Mañana",
      client_name: "Carlos Rodríguez",
      client_phone: "098 765 432",
      status: "pending",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Hace 1 hora
      telegram_thread_id: "thread_002",
    },
    {
      id: "mock003",
      items: "Aire acondicionado viejo, cableado",
      address: "Bulevar Artigas 1234",
      neighborhood: "Cordón",
      preferred_date: "Hoy",
      client_name: "Ana Martínez",
      status: "pending",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Hace 30 min
      telegram_thread_id: "thread_003",
    },
    {
      id: "mock004",
      items: "Cocina a gas, horno eléctrico",
      address: "Canelones 1567",
      neighborhood: "Centro",
      preferred_date: "Cuando puedan",
      client_name: "Jorge Silva",
      client_phone: "099 888 777",
      status: "pending",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Hace 4 horas
      telegram_thread_id: "thread_004",
    },
    {
      id: "mock005",
      items: "Bicicleta rota, silla de metal",
      address: "Propios 3421",
      neighborhood: "Aguada",
      preferred_date: "Hoy por la tarde",
      client_name: "Lucía Fernández",
      status: "pending",
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Hace 15 min
      telegram_thread_id: "thread_005",
    },
    {
      id: "mock006",
      items: "Portón de hierro, reja vieja",
      address: "Av. 18 de Julio 1856",
      neighborhood: "Centro",
      preferred_date: "Hoy",
      client_name: "Roberto Pérez",
      client_phone: "094 333 222",
      status: "pending",
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Hace 5 min
      telegram_thread_id: "thread_006",
    },
    {
      id: "mock007",
      items: "Batería de auto, radiador",
      address: "Rivera 2890",
      neighborhood: "La Blanqueada",
      preferred_date: "Mañana temprano",
      status: "pending",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // Hace 3 horas
      telegram_thread_id: "thread_007",
    },
  ];

  return mockOrders;
  */
}

export async function markOrdersAsRouted(orderIds: string[]): Promise<void> {
  for (const id of orderIds) {
    const order = await kv.hgetall(`order:${id}`);
    if (order) {
      await kv.hset(`order:${id}`, { ...order, status: "routed" });
      await kv.srem("orders:pending", id);
      await kv.sadd("orders:routed", id);
    }
  }
}

export async function saveMessage(
  threadId: string,
  role: string,
  content: string
): Promise<void> {
  await kv.rpush(`conversation:${threadId}`, JSON.stringify({ role, content }));
  // Mantener solo los últimos 20 mensajes por conversación
  await kv.ltrim(`conversation:${threadId}`, -20, -1);
}

export async function getConversationHistory(threadId: string): Promise<any[]> {
  const messages = (await kv.lrange(`conversation:${threadId}`, 0, -1)) as any[];
  return messages.map((m) => {
    // Si ya es un objeto, devolverlo directamente
    if (typeof m === "object") return m;
    // Si es string, parsearlo
    return JSON.parse(m as string);
  });
}
