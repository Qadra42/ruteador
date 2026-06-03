/**
 * Audio transcription service using Azure Whisper
 */

/**
 * Transcribe audio file to text using Azure Whisper
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const endpoint = process.env.AZURE_WHISPER_ENDPOINT;
  const apiKey = process.env.AZURE_WHISPER_API_KEY;
  const deployment = process.env.AZURE_WHISPER_DEPLOYMENT_NAME;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure Whisper configuration missing');
  }

  try {
    // 1. Download audio from Kapso
    console.log('🎤 Downloading audio from:', audioUrl);
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('📦 Audio downloaded, size:', audioBlob.size, 'bytes');

    // 2. Prepare form data for Azure Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');

    // 3. Call Azure Whisper transcription endpoint
    const transcriptionUrl = `${endpoint}/openai/deployments/${deployment}/audio/transcriptions?api-version=2024-06-01`;

    console.log('🔄 Calling Whisper API...');
    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const transcription = result.text;

    console.log('✅ Transcription:', transcription);
    return transcription;

  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
    throw error;
  }
}
