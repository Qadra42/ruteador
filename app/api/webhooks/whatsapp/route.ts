import { NextRequest, NextResponse } from 'next/server';
import { handleMessage } from '@/lib/agent/agent.service';
import { kapso } from '@/lib/whatsapp';
import { sql } from '@/lib/db';
import crypto from 'crypto';

/**
 * Verifica la firma del webhook de Kapso (seguridad)
 * Usa HMAC SHA256 según la doc oficial de Kapso
 */
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-webhook-signature');
  const secret = process.env.KAPSO_WEBHOOK_SECRET;

  if (!signature || !secret) {
    console.error('❌ Missing signature or secret:', {
      hasSignature: !!signature,
      hasSecret: !!secret,
    });
    return false;
  }

  // Crear la firma esperada usando HMAC SHA256
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Comparación timing-safe para prevenir timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Error comparing signatures:', error);
    return false;
  }
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

    // Ignorar mensajes salientes (los que envía el bot)
    if (message.kapso?.direction === 'outbound') {
      console.log('⚠️ Ignorando mensaje saliente (outbound)');
      return NextResponse.json({ status: 'ignored outbound message' });
    }

    // Datos del mensaje
    const from = message.from; // Número del cliente (ej: "59892065628")
    const messageId = message.id;
    const messageType = message.type; // "text", "audio", "image", etc.

    console.log(`📱 Mensaje de ${from}, tipo: ${messageType}`);

    let messageText: string;

    // Handle different message types
    if (messageType === 'text') {
      messageText = message.text.body;
      console.log(`💬 Texto: "${messageText}"`);
    } else if (messageType === 'audio') {
      console.log('🎤 Procesando audio...');

      // Kapso provides automatic transcription
      const transcript = message.kapso?.transcript?.text;

      if (!transcript) {
        console.error('❌ No transcript available from Kapso');
        await kapso.sendMessage({
          to: from,
          message: 'Lo siento, no pude procesar el audio. Por favor intentá de nuevo o escribime un mensaje de texto.',
        });
        return NextResponse.json({ status: 'audio transcription failed' });
      }

      messageText = transcript;
      console.log(`✅ Audio transcrito por Kapso: "${messageText}"`);
    } else {
      console.log('⚠️ Tipo de mensaje no soportado:', messageType);
      await kapso.sendMessage({
        to: from,
        message: 'Por ahora solo puedo procesar mensajes de texto y audios.',
      });
      return NextResponse.json({ status: 'unsupported type' });
    }

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

    // Send response via WhatsApp (only if not empty)
    if (response && response.trim().length > 0) {
      await kapso.sendMessage({
        to: from,
        message: response,
      });
    } else {
      console.log('⚠️ Empty response from agent, skipping message send');
    }

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
