# ✅ Fase 1 Completada: WhatsApp + Español

## 🎉 Lo que se implementó

1. ✅ Cliente de WhatsApp (Kapso) - `lib/whatsapp.ts`
2. ✅ Webhook de WhatsApp - `app/api/webhooks/whatsapp/route.ts`
3. ✅ Prompts cambiados a español rioplatense - `lib/agent.ts`
4. ✅ Variables de entorno actualizadas - `.env.example`

## 🔧 Próximos pasos para completar el setup

### 1. Crear cuenta en Kapso (5 minutos)

1. Ve a [kapso.ai](https://kapso.ai)
2. Creá una cuenta
3. Conectá tu número de WhatsApp Business
4. Obtené las credenciales del dashboard

### 2. Configurar variables de entorno (2 minutos)

Editá tu `.env.local` y agregá:

```bash
# WhatsApp (Kapso)
KAPSO_API_KEY=tu_api_key_de_kapso
KAPSO_PHONE_NUMBER_ID=tu_phone_number_id_de_kapso
KAPSO_VERIFY_TOKEN=ruteador_verify_token
```

**⚠️ IMPORTANTE:** Mantené las otras variables que ya tenías (Anthropic, Google Maps, KV).

### 3. Instalar dependencias (si hacen falta)

```bash
cd /Users/francisco/dev/ruteador
bun install
```

### 4. Testear localmente (5 minutos)

```bash
bun run dev
```

El webhook estará disponible en:
```
http://localhost:3000/api/webhooks/whatsapp
```

Para testear el webhook localmente, necesitás un túnel (ej: ngrok):

```bash
# En otra terminal
ngrok http 3000

# Copiá la URL que te da (ej: https://abc123.ngrok.io)
```

### 5. Deploy a Vercel (3 minutos)

```bash
# Commit cambios
git add .
git commit -m "feat: WhatsApp integration with Kapso + Spanish prompts"

# Deploy
vercel --prod
```

### 6. Configurar webhook en Kapso (2 minutos)

1. Ve al dashboard de Kapso
2. Configurá el webhook URL:
   ```
   https://tu-dominio.vercel.app/api/webhooks/whatsapp
   ```
3. Webhook verify token: `ruteador_verify_token` (o el que pusiste en .env)
4. Guardá los cambios

Kapso va a verificar el webhook automáticamente llamando al endpoint GET.

### 7. Agregar variables de entorno en Vercel (2 minutos)

En el dashboard de Vercel (Settings → Environment Variables):

```
KAPSO_API_KEY = tu_api_key
KAPSO_PHONE_NUMBER_ID = tu_phone_number_id
KAPSO_VERIFY_TOKEN = ruteador_verify_token
```

Después de agregar, re-deployá:

```bash
vercel --prod
```

## 🧪 Testing

### Test 1: Mensaje simple

Mandá un mensaje a tu número de WhatsApp Business:

```
Hola
```

Deberías recibir una respuesta en español del agente.

### Test 2: Pedido completo

```
Cliente: Hola, tengo una heladera vieja para tirar
Bot: Hola! Dale, la retiramos. ¿Cuál es la dirección?
Cliente: Rivera 1500, La Comercial
Bot: Perfecto. ¿Qué día te viene bien?
Cliente: Mañana
Bot: Bárbaro. ¿Un nombre para el pedido?
Cliente: Roberto
Bot: CONFIRMADO. Listo Roberto, pasamos mañana. Gracias!
```

### Test 3: Verificar que se guardó el pedido

1. Ve al dashboard: `https://tu-dominio.vercel.app/dashboard`
2. Deberías ver el pedido de Roberto con:
   - Items: "heladera"
   - Dirección: "Rivera 1500"
   - Barrio: "La Comercial"
   - Fecha: "mañana"

## 🐛 Troubleshooting

### Error: "Kapso credentials not configured"

**Solución:** Verificá que las variables `KAPSO_API_KEY` y `KAPSO_PHONE_NUMBER_ID` estén en `.env.local` y en Vercel.

### El bot no responde

1. Verificá que el webhook esté configurado correctamente en Kapso
2. Chequeá los logs en Vercel: `vercel logs`
3. Verificá que el deployment tenga las variables de entorno

### El bot responde en inglés

**Solución:** Re-deployá. El cambio a español está en `lib/agent.ts` y necesita estar en producción.

### Webhook verification failed

**Solución:** Verificá que el `KAPSO_VERIFY_TOKEN` en .env coincida con el que pusiste en el dashboard de Kapso.

## 📊 Verificación final

- [ ] Cuenta de Kapso creada
- [ ] Número de WhatsApp conectado
- [ ] Variables de entorno configuradas (local y Vercel)
- [ ] Código deployado a Vercel
- [ ] Webhook configurado en Kapso
- [ ] Test: Bot responde en español
- [ ] Test: Pedido completo se guarda en dashboard

## 🎯 Próxima fase

**Fase 2: Postgres + Multi-tenant**

Cuando estés listo, seguí con `MIGRATION_PLAN.md` - Fase 2.

---

¡Felicitaciones! Ya tenés WhatsApp funcionando en español 🎉
