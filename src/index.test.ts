import app from "./index";
import {TwilioStartEvent} from "./services/TwilioMediaStream";

describe('Web Socket', () => {
    test('GET /ws/voice', async () => {
        const res = await app.request('/ws/voice', {
            method: 'GET',
            headers: { 'Upgrade': 'websocket' }
        })

        expect(res.status).toBe(101)
        expect(res.webSocket).toBeDefined()
        expect(res.webSocket.readyState).toBe(1)
    })
})