import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

const demoOrders = [
  {
    items: "Old washing machine, refrigerator",
    address: "Bv. Artigas 1234",
    neighborhood: "Cordón",
    preferred_date: "Today",
    client_name: "Ana Martínez",
    client_phone: "094 123 456",
  },
  {
    items: "Iron gate, old fencing",
    address: "Av. 18 de Julio 1856",
    neighborhood: "Centro",
    preferred_date: "Tomorrow morning",
    client_name: "Roberto Pérez",
    client_phone: "099 234 567",
  },
  {
    items: "Broken air conditioner, fan, wiring",
    address: "Av. 8 de Octubre 2456",
    neighborhood: "Cordón",
    preferred_date: "Today afternoon",
    client_name: "Lucía Fernández",
    client_phone: "094 333 222",
  },
  {
    items: "Broken bicycle, metal chair",
    address: "Rivera 3421",
    neighborhood: "Cordón",
    preferred_date: "Tomorrow",
    client_name: "Martín González",
    client_phone: "098 444 333",
  },
  {
    items: "Microwave, toaster, iron",
    address: "Av. Italia 3500",
    neighborhood: "Pocitos",
    preferred_date: "Today",
    client_name: "Carla Suárez",
    client_phone: "092 555 444",
  },
  {
    items: "Kerosene heater, water heater",
    address: "Bulevar España 2650",
    neighborhood: "Punta Carretas",
    preferred_date: "Tomorrow afternoon",
    client_name: "Diego Costa",
    client_phone: "095 555 444",
  },
  {
    items: "Metal table, rusty garden chairs",
    address: "Comercio 1567",
    neighborhood: "Cordón",
    preferred_date: "Today",
    client_name: "Patricia Vidal",
    client_phone: "099 666 555",
  },
  {
    items: "Stove pipe, old radiator",
    address: "Canelones 1234",
    neighborhood: "Centro",
    preferred_date: "Tomorrow morning",
    client_name: "Juan Rodríguez",
    client_phone: "097 777 666",
  },
  {
    items: "Hair dryer, mixer, toaster",
    address: "Ejido 1456",
    neighborhood: "Centro",
    preferred_date: "Today afternoon",
    client_name: "Gabriela Núñez",
    client_phone: "094 777 888",
  },
  {
    items: "Old iron grill, chains, wire",
    address: "Av. Agraciada 3200",
    neighborhood: "Aguada",
    preferred_date: "Tomorrow",
    client_name: "Fernando Silva",
    client_phone: "098 888 999",
  },
];

async function seedData() {
  console.log("Seeding demo data...");

  for (const orderData of demoOrders) {
    const orderId = nanoid(8);
    const threadId = `demo_${orderId}`;

    const order = {
      id: orderId,
      items: orderData.items,
      address: orderData.address,
      neighborhood: orderData.neighborhood,
      preferred_date: orderData.preferred_date,
      client_name: orderData.client_name,
      client_phone: orderData.client_phone || "",
      status: "pending",
      created_at: new Date().toISOString(),
      telegram_thread_id: threadId,
    };

    // Save order
    await kv.hset(`order:${orderId}`, order);
    await kv.sadd("orders:pending", orderId);

    console.log(`✅ Created order ${orderId}: ${orderData.client_name} - ${orderData.address}`);
  }

  console.log(`\n✅ Seeded ${demoOrders.length} demo orders!`);
}

seedData().catch(console.error);
