/**
 * @see https://www.twilio.com/docs/voice/media-streams/websocket-messages
 */
import {WSContext} from "hono/dist/types/helper/websocket";

enum TwilioRequestEventTypes {
  Start = "start",
  Media = "media",
  Mark = "mark",
  Stop = "stop",
  DTMF = "dtmf",
}

export interface TwilioWebSocketRequest {
  event: "start" | "media" | "mark" | "stop" | "dtmf";
  /** Number used to keep track of message sending order. The first message has a value of 1 and then is incremented for each subsequent message. */
  sequenceNumber: number;
  /** The unique identifier of the Stream, repeated for ease of access. */
  streamSid: string;
}

export interface TwilioStartEvent extends TwilioWebSocketRequest {
  event: "start";
  /** Object containing Stream metadata. */
  start: {
    /** The unique identifier of the Stream. */
    streamSid: string;

    /** The SID of the Account that created the Stream. */
    accountSid: string;

    /** The SID of the Call that started the Stream. */
    callSid: string;

    /** Array of strings that indicate which media flows are expected in subsequent messages. Values include "inbound", "outbound". */
    tracks: string[];

    /** Object containing the custom parameters that were set when defining the Stream. */
    customParameters: { [key: string]: any };

    /** Object containing the format of the payload in the media messages. */
    mediaFormat: {
      /** The encoding of the data in the upcoming payload. Value is always "audio/x-mulaw". */
      encoding: 'audio/x-mulaw';

      /** The sample rate in hertz of the upcoming audio data. Value is always 8000. */
      sampleRate: 8000;

      /** The number of channels in the input audio data. Value is always 1. */
      channels: 1;
    };
  };
}

export interface TwilioMediaEvent extends TwilioWebSocketRequest {
  event: "media";
  /** Object containing media metadata and payload. */
  media: {
    /** Indicates whether the media is "inbound" or "outbound". */
    track: 'inbound' | 'outbound';

    /** The chunk number for the message. The first message will begin with 1 and increment with each subsequent message. */
    chunk: number;

    /** Presentation Timestamp in Milliseconds from the start of the stream. */
    mediaTimestamp: number;

    /** Raw audio data encoded in base64. */
    payload: string;
  };
}

export interface TwilioMarkEvent extends TwilioWebSocketRequest {
  event: "mark";
  /** Object containing the mark metadata. */
  mark: {
    /** A custom value. Twilio sends back the mark.name you specify when it receives a mark message. */
    name: string;
  };
}

export interface TwilioStopEvent extends TwilioWebSocketRequest {
  event: "stop";
  /** Object containing metadata about the stream termination. */
  stop: {
    /** The Account identifier that created the Stream. */
    accountSid: string;

    /** The Call identifier that started the Stream. */
    callSid: string;
  };
}

export interface TwilioDTMFEvent extends TwilioWebSocketRequest {
  event: "dtmf";
  /** Object containing metadata about the DTMF tone. */
  dtmf: {
    /** The track on which the DTMF key was pressed. Value is always "inbound_track". */
    track: 'inbound_track';

    /** The number-key tone detected. */
    digit: string;
  };
}

export interface TwilioWebSocketResponse {
  event: "media" | "mark" | "clear"
  streamSid: string;
}

export interface TwilioMediaResponse extends TwilioWebSocketResponse {
  event: "media";
  /** Object containing media metadata and payload. */
  media: {
    /** Raw mulaw/8000 audio in encoded in base64 */
    payload: string;
  };
}

export interface TwilioMarkResponse extends TwilioWebSocketResponse {
  event: "mark";
  /** Object containing the mark metadata. */
  mark: {
    /** A name specific to your needs that will assist in recognizing future received mark event */
    name: string;
  };
}

export interface TwilioClearResponse extends TwilioWebSocketResponse {
  event: "clear";
}

export interface TwilioEventHandlers {
  onStart?: (evt: TwilioStartEvent) => void;
  onMedia?: (evt: TwilioMediaEvent) => void;
  onMark?: (evt: TwilioMarkEvent) => void;
  onStop?: (evt: TwilioStopEvent) => void;
  onDTMF?: (evt: TwilioDTMFEvent) => void;
}
export class TwilioMediaStream {
  private handlers: TwilioEventHandlers = {};
  private ws: WSContext;
  private streamSid: string|undefined;

  constructor(handlers: TwilioEventHandlers) {
    this.handlers = handlers;
  }

  public onMessage(evt: MessageEvent, ws: WSContext) {
    let req
    try {
      req = JSON.parse(evt.data) as TwilioWebSocketRequest
    } catch (error) {
      console.error('TwilioMediaStream: Error parsing message event', error, evt)
      return
    }

    this.ws = ws

    try {
      if (req.event === TwilioRequestEventTypes.Start) {
        this.streamSid = req.streamSid;
        this.handlers.onStart?.(req as TwilioStartEvent);
      } else if (req.event === TwilioRequestEventTypes.Media) {
        this.handlers.onMedia?.(req as TwilioMediaEvent);
      } else if (req.event === TwilioRequestEventTypes.Mark) {
        this.handlers.onMark?.(req as TwilioMarkEvent);
      } else if (req.event === TwilioRequestEventTypes.Stop) {
        this.handlers.onStop?.(req as TwilioStopEvent);
      } else if (req.event === TwilioRequestEventTypes.DTMF) {
        this.handlers.onDTMF?.(req as TwilioDTMFEvent);
      }
    } catch (error) {
      console.error('TwilioMediaStream: Error handling message event', error, req)
    }
  }

  public sendMedia(name: string, payload: string) {
    this.sendResponse({
      event: "media",
      streamSid: this.streamSid,
      media: {
        payload,
      },
    } as TwilioMediaResponse);

    this.sendResponse({
      event: "mark",
      streamSid: this.streamSid,
      mark: {
        name,
      },
    } as TwilioMarkResponse);
  }

  public sendClear() {
    this.sendResponse({
      event: "clear",
      streamSid: this.streamSid,
    } as TwilioClearResponse);
  }

  private sendResponse(response: TwilioWebSocketResponse) {
    return this.ws.send(JSON.stringify(response))
  }

}