import {Hono} from 'hono'
import {env} from 'hono/adapter'
import {upgradeWebSocket} from 'hono/cloudflare-workers'
import {TwilioMediaStream} from "./services/TwilioMediaStream";
import {OpenAiService} from "./services/OpenAiService";
import {MediaQueue} from "./services/MediaQueue";
import {DeepgramService} from "./services/DeepgramService";
import {ElevenLabsService} from "./services/ElevenLabsService";

const app = new Hono()

/** @see https://www.twilio.com/docs/voice/twiml#twilios-request-to-your-application */
interface TwilioWebHookRequest {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: "queued" | "ringing" | "in-progress" | "completed" | "busy" | "failed" | "no-answer";
  ApiVersion: string;
  Direction: "inbound" | "outbound-api" | "outbound-dial";
  ForwardedFrom: string;
  Caller: string;
  CallerName: string;
  ParentCallSid: string;
  CallType: string;

  // Optional
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

app.post('/webhook', async (c) => {
  const reqUrl = new URL(c.req.url)

  return c.body(`<Response><Connect><Stream url="wss://${reqUrl.host}:${reqUrl.port}/ws/voice" /></Connect></Response>`, 200, {
    'Content-Type': 'text/xml',
  })
})

app.get(
  '/ws/voice',
  upgradeWebSocket((c) => {
    const { DEEPGRAM_API_KEY, ELEVEN_LABS_API_KEY, OPENAI_API_KEY } = env(c)

    const greetingText = 'Hello, how can I help you today?'

    const elevenLabsService = new ElevenLabsService(ELEVEN_LABS_API_KEY)
    const greetingAudio = elevenLabsService.textToSpeech(greetingText)

    const openAi = new OpenAiService({apiKey: OPENAI_API_KEY})

    openAi.addMessage('system', `You are an phone assistant. You must respond only in simple, short responses.
      Keep your responses concise and to the point. Preferably one sentence, two max. Ask for clarification if a user request is ambiguous.
      This is a demo so generally accept any user input and provide a response, make up success/confirmations.`)
    openAi.addMessage('assistant', greetingText)

    const queue = new MediaQueue()

    const deepgram = new DeepgramService(DEEPGRAM_API_KEY, {
      onSpeechStart: (evt) => {
        queue.clear()
        twilio.sendClear()
      },
      onTranscript: async (evt) => {
        if(evt.is_final && evt.channel.alternatives[0].transcript) {
          const response = await openAi.makeResponse(evt.channel.alternatives[0].transcript)
          queue.push( await elevenLabsService.textToSpeech(response) )
        }
      },
    })

    const twilio = new TwilioMediaStream({
      onStart: async (evt) => {
        queue.push( await greetingAudio )
      },
      onMedia: async (evt) => {
        deepgram.send(evt.media.payload)
        const audio = queue.shift()
        audio && twilio.sendMedia(audio.mark, audio.media)
      },
      onMark: async (evt) => {
        queue.remove(evt.mark.name)
      },
    })

    return {
      onMessage: twilio.onMessage.bind(twilio),
      onError: console.error
    }
  })
)

app.get(
  '/ws/chat',
  upgradeWebSocket((c) => {
    const { OPENAI_API_KEY } = env(c)
    // @ts-ignore
    const chat = new OpenAiService({apiKey: OPENAI_API_KEY})

    return {
      async onMessage(evt, ws) {
        ws.send(await chat.makeResponse(evt.data))
      },
      onError: console.error
    }
  })
)

export default app
