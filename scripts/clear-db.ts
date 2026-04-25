import { kv } from "@vercel/kv";

async function clearDatabase() {
  console.log("Clearing database...");

  // Get all pending and routed order IDs
  const pendingIds = (await kv.smembers("orders:pending")) as string[];
  const routedIds = (await kv.smembers("orders:routed")) as string[];
  const completedIds = (await kv.smembers("orders:completed")) as string[];

  const allOrderIds = [...pendingIds, ...routedIds, ...completedIds];

  console.log(`Found ${allOrderIds.length} orders to delete`);

  // Delete all orders
  for (const orderId of allOrderIds) {
    await kv.del(`order:${orderId}`);
    await kv.del(`history:${orderId}`);
    console.log(`Deleted order ${orderId}`);
  }

  // Clear the sets
  await kv.del("orders:pending");
  await kv.del("orders:routed");
  await kv.del("orders:completed");

  // Get all route keys and delete them
  const routeKeys = await kv.keys("route:*");
  for (const key of routeKeys) {
    await kv.del(key);
    console.log(`Deleted ${key}`);
  }

  // Get all conversation history keys and delete them
  const historyKeys = await kv.keys("history:*");
  for (const key of historyKeys) {
    await kv.del(key);
    console.log(`Deleted conversation ${key}`);
  }

  console.log("✅ Database cleared!");
}

clearDatabase().catch(console.error);
