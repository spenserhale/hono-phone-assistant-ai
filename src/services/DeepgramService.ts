
import {LiveTranscriptionEvent} from "@deepgram/sdk/src/lib/types/LiveTranscriptionEvent";
import {LiveSchema} from "@deepgram/sdk/src/lib/types";
import {LiveClient} from "@deepgram/sdk/src/packages/LiveClient";
import {SpeechStartedEvent} from "@deepgram/sdk/src/lib/types/SpeechStartedEvent";
import {UtteranceEndEvent} from "@deepgram/sdk/src/lib/types/UtteranceEndEvent";
import { LiveTranscriptionEvents } from "@deepgram/sdk/src/lib/enums";
import DeepgramClient from "@deepgram/sdk/src/DeepgramClient";
import {Buffer} from "node:buffer";

export interface DeepgramEventHandlers {
  onTranscript?: (evt: LiveTranscriptionEvent) => void;
  onSpeechStart?: (evt: SpeechStartedEvent) => void;
  onUtteranceEnd?: (evt: UtteranceEndEvent) => void;
}

export class DeepgramService {
  private handlers: DeepgramEventHandlers = {};
  private deepgramClient: DeepgramClient;
  private liveClient: LiveClient;

  constructor(apiKey: string, handlers: DeepgramEventHandlers, options: LiveSchema = {}) {
    this.handlers = handlers;
    this.deepgramClient = new DeepgramClient(apiKey, {});

    const liveSchemaDefaults = {
      encoding: 'mulaw',
      sample_rate: '8000',
      model: 'nova-2',
      smart_formatting: true,
      punctuate: true,
      endpointing: 200,
      interim_results: true,
      utterance_end_ms: 2000,
      vad_events: true,
    }

    this.liveClient = this.deepgramClient.listen.live({...liveSchemaDefaults, ...options} as LiveSchema);


    this.liveClient.addListener(LiveTranscriptionEvents.Open, async () => {
      if(this.handlers.onTranscript) {
        this.liveClient.addListener(LiveTranscriptionEvents.Transcript, this.handlers.onTranscript);
      }

      if(this.handlers.onSpeechStart) {
        this.liveClient.addListener(LiveTranscriptionEvents.SpeechStarted, this.handlers.onSpeechStart);
      }

      if(this.handlers.onUtteranceEnd) {
        this.liveClient.addListener(LiveTranscriptionEvents.UtteranceEnd, this.handlers.onUtteranceEnd);
      }

      this.liveClient.addListener(LiveTranscriptionEvents.Close, async () => {
        this.liveClient.finish();
      });

      this.liveClient.addListener(LiveTranscriptionEvents.Error, async (error) => {
        console.error("deepgram: error received", error);
      });

      this.liveClient.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
        console.warn("deepgram: warning received", warning);
      });
    });
  }

  public send(payload: string) {
    this.liveClient.send(Buffer.from(payload, 'base64'));
  }
}