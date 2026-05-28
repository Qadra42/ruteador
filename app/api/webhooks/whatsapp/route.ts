import { NextRequest, NextResponse } from 'next/server';
import { handleMessage } from '@/lib/agent/agent.service';
import { kapso } from '@/lib/whatsapp';
import { sql } from '@/lib/db';

/**
 * Verifica la firma del webhook de Kapso (seguridad)
 * Por ahora deshabilitado en testing - TODO: implementar correctamente
 */
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-kapso-signature');
  const secret = process.env.KAPSO_WEBHOOK_SECRET;

  // Logging para debug
  console.log('🔐 Webhook signature check:', {
    hasSignature: !!signature,
    hasSecret: !!secret,
  });

  // Por ahora permitimos todos los requests (testing)
  // TODO: Implementar verificación correcta cuando tengamos la spec de Kapso
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

    // Estructura del webhook de Kapso (real)
    const message = body.message;

    if (!message) {
      console.log('⚠️ No hay mensaje en el webhook');
      return NextResponse.json({ status: 'no message' });
    }

    // Datos del mensaje
    const from = message.from; // Número del cliente (ej: "59892065628")
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

    console.log(`💬 Texto: "${messageText}"`);

    // Identify which company owns this WhatsApp number
    const businessWhatsAppNumber = process.env.KAPSO_PHONE_NUMBER_ID;

    if (!businessWhatsAppNumber) {
      console.error('❌ KAPSO_PHONE_NUMBER_ID not configured');
      await kapso.sendMessage({
        to: from,
        message: 'Lo sentimos, el servicio no está configurado correctamente. Por favor contactá al administrador.',
      });
      return NextResponse.json({ error: 'WhatsApp number not configured' }, { status: 500 });
    }

    const [company] = await sql`
      SELECT * FROM companies
      WHERE whatsapp_number = ${businessWhatsAppNumber}
      LIMIT 1
    `;

    if (!company) {
      console.error(`❌ No company found for WhatsApp: ${businessWhatsAppNumber}`);
      await kapso.sendMessage({
        to: from,
        message: 'Lo sentimos, el servicio no está configurado correctamente. Por favor contactá al administrador.',
      });
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    console.log(`🏢 Company identified: ${company.name} (${company.id})`);

    // Thread ID unique per company + customer
    const threadId = `${company.id}:${from}`;

    // Process message with multi-tenant agent
    const response = await handleMessage(messageText, threadId, company.id, from);

    console.log(`🤖 Respuesta: "${response}"`);

    // Send response via WhatsApp
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
