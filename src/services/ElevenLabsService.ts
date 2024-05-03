export interface ElevenLabsConfig {
  API_KEY: string
  MODEL_ID: string
  OUTPUT_FORMAT: string
  VOICE_ID: string
}

export class ElevenLabsService {
  private config: ElevenLabsConfig;

  constructor(apiKey: string, config: Partial<ElevenLabsConfig> = {}) {
    const defaults = {
      MODEL_ID: 'eleven_turbo_v2',
      OUTPUT_FORMAT: 'ulaw_8000',
      VOICE_ID: '21m00Tcm4TlvDq8ikWAM', // See https://api.elevenlabs.io/v1/voices
    }

    this.config = {API_KEY: apiKey, ...defaults, ...config};
  }
  public async textToSpeech(text: string): Promise<string> {
    const c = this.config;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${c.VOICE_ID}/stream?output_format=${c.OUTPUT_FORMAT}&optimize_streaming_latency=3`, {
        headers: {
          'xi-api-key': c.API_KEY,
          'Content-Type': 'application/json',
          accept: 'audio/wav',
        },
        method: 'POST', body: JSON.stringify({ model_id: c.MODEL_ID, text })
      })

    return btoa(String.fromCharCode(...new Uint8Array(await response.arrayBuffer())));
  }
}