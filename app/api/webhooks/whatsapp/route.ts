import { NextRequest, NextResponse } from 'next/server';
import { handleMessage } from '@/lib/agent';
import { kapso } from '@/lib/whatsapp';

/**
 * Verifica la firma del webhook de Kapso (seguridad)
 */
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-kapso-signature');
  const secret = process.env.KAPSO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('⚠️ KAPSO_WEBHOOK_SECRET not configured - skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    console.warn('⚠️ No signature in webhook request');
    return false;
  }

  // TODO: Implementar verificación real de firma según docs de Kapso
  // Por ahora permitimos todo en testing
  return true;
}

/**
 * WhatsApp Webhook Handler (Kapso)
 *
 * Procesa mensajes entrantes de WhatsApp y responde con el agente conversacional.
 * Por ahora solo soporta mensajes de texto (audios en Fase 4).
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Verificar firma del webhook (seguridad)
    if (!verifyWebhookSignature(request, bodyText)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('📨 WhatsApp webhook recibido:', JSON.stringify(body, null, 2));

    // Estructura del webhook de Kapso
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) {
      console.log('⚠️ No hay mensaje en el webhook');
      return NextResponse.json({ status: 'no message' });
    }

    // Datos del mensaje
    const from = message.from; // Número del cliente (ej: "598xxxxxxxx")
    const messageId = message.id;
    const messageType = message.type; // "text", "audio", "image", etc.

    console.log(`📱 Mensaje de ${from}, tipo: ${messageType}`);

    // Por ahora solo procesamos texto
    // TODO: Audios en Fase 4 con Whisper
    if (messageType !== 'text') {
      console.log('⚠️ Tipo de mensaje no soportado:', messageType);
      await kapso.sendMessage({
        to: from,
        message: 'Por ahora solo puedo procesar mensajes de texto. ¡Los audios llegarán pronto!',
      });
      return NextResponse.json({ status: 'unsupported type' });
    }

    const messageText = message.text.body;
    const threadId = from; // Usamos el número como thread ID

    console.log(`💬 Texto: "${messageText}"`);

    // Procesar mensaje con el agente
    const response = await handleMessage(messageText, threadId);

    console.log(`🤖 Respuesta: "${response}"`);

    // Enviar respuesta por WhatsApp
    await kapso.sendMessage({
      to: from,
      message: response,
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Error en webhook de WhatsApp:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verificación del webhook (GET)
 *
 * Kapso llama a este endpoint con parámetros de verificación
 * durante el setup inicial del webhook.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.KAPSO_VERIFY_TOKEN || 'ruteador_verify_token';

  console.log('🔍 Verificación de webhook:', { mode, token, challenge });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verificado correctamente');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('❌ Verificación fallida');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
