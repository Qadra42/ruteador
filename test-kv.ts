import { kv } from "@vercel/kv";

async function testKV() {
  console.log("🔍 Verificando KV...");

  // Listar todas las keys de pedidos pendientes
  const pendingIds = await kv.smembers("orders:pending");
  console.log("📋 Pedidos pendientes IDs:", pendingIds);

  // Ver cada pedido
  for (const id of pendingIds as string[]) {
    const order = await kv.hgetall(`order:${id}`);
    console.log(`📦 Pedido ${id}:`, order);
  }

  // Listar todas las keys que empiecen con "order:"
  const allKeys = await kv.keys("*");
  console.log("🔑 Todas las keys en KV:", allKeys);

  process.exit(0);
}

testKV().catch(console.error);
