export class CaptionDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.slidingBuffer = new Uint8Array(0);
    this.contextPrompt = "";
    this.maxBufferSize = 5 * 16000 * 2; // ~5 sec 16kHz 16-bit PCM buffer cap
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket Upgrade for Live Broadcast Streaming
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);
      this.sessions.add(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    // Audio Chunk Ingestion POST Endpoint
    if (request.method === "POST" && url.pathname === "/api/audio") {
      const arrayBuffer = await request.arrayBuffer();
      const chunk = new Uint8Array(arrayBuffer);

      // Append chunk to sliding window buffer
      const newBuffer = new Uint8Array(this.slidingBuffer.length + chunk.length);
      newBuffer.set(this.slidingBuffer, 0);
      newBuffer.set(chunk, this.slidingBuffer.length);
      this.slidingBuffer = newBuffer;

      // Retain sliding window within threshold limit
      if (this.slidingBuffer.length > this.maxBufferSize) {
        this.slidingBuffer = this.slidingBuffer.slice(this.slidingBuffer.length - this.maxBufferSize);
      }

      // Execute Workers AI Whisper Inference
      try {
        // Construct valid RIFF WAV header for 16kHz 16-bit Mono PCM
        const numChannels = 1;
        const sampleRate = 16000;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = this.slidingBuffer.length;
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        /* RIFF identifier */
        view.setUint32(0, 0x52494646, false); // "RIFF"
        /* file length */
        view.setUint32(4, 36 + dataSize, true);
        /* RIFF type */
        view.setUint32(8, 0x57415645, false); // "WAVE"
        /* format chunk identifier */
        view.setUint32(12, 0x666d7420, false); // "fmt "
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw PCM) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate */
        view.setUint32(28, byteRate, true);
        /* block align */
        view.setUint16(32, blockAlign, true);
        /* bits per sample */
        view.setUint16(34, bitsPerSample, true);
        /* data chunk identifier */
        view.setUint32(36, 0x64617461, false); // "data"
        /* data chunk length */
        view.setUint32(40, dataSize, true);

        const wavBuffer = new Uint8Array(44 + dataSize);
        wavBuffer.set(new Uint8Array(header), 0);
        wavBuffer.set(this.slidingBuffer, 44);

        const input = {
          audio: Array.from(wavBuffer),
          initial_prompt: this.contextPrompt
        };

        const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", input);
        console.log("Whisper AI Response:", JSON.stringify(response));

        if (response && response.text) {
          const text = response.text.trim();
          if (text.length > 0) {
            // Update context memory prompt for continuous sliding-window context
            this.contextPrompt = text.slice(-200);

            const payload = JSON.stringify({
              type: "caption",
              text: text,
              timestamp: Date.now()
            });

            // Broadcast real-time captions to all connected websockets (OBS overlay / Admin)
            for (const ws of this.sessions) {
              try {
                ws.send(payload);
              } catch (e) {
                this.sessions.delete(ws);
              }
            }
          }
        }
      } catch (err) {
        console.error("Whisper Workers AI error:", err);
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Spoken Light Audio DurableObject", { status: 200 });
  }

  async webSocketMessage(ws, message) {
    // Check if message is binary audio data (ArrayBuffer or Uint8Array)
    if (message instanceof ArrayBuffer || message instanceof Uint8Array || ArrayBuffer.isView(message)) {
      const chunk = new Uint8Array(message);
      
      // Append chunk to sliding window buffer
      const newBuffer = new Uint8Array(this.slidingBuffer.length + chunk.length);
      newBuffer.set(this.slidingBuffer, 0);
      newBuffer.set(chunk, this.slidingBuffer.length);
      this.slidingBuffer = newBuffer;

      // Clamp sliding window buffer to max threshold
      if (this.slidingBuffer.length > this.maxBufferSize) {
        this.slidingBuffer = this.slidingBuffer.slice(this.slidingBuffer.length - this.maxBufferSize);
      }

      // Execute Workers AI Whisper Inference
      try {
        const numChannels = 1;
        const sampleRate = 16000;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = this.slidingBuffer.length;
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        const wavBuffer = new Uint8Array(44 + dataSize);
        wavBuffer.set(new Uint8Array(header), 0);
        wavBuffer.set(this.slidingBuffer, 44);

        const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
          audio: wavBuffer,
          initial_prompt: this.contextPrompt
        });

        if (response && response.text) {
          const text = response.text.trim();
          if (text.length > 0) {
            this.contextPrompt = text.slice(-200);
            const payload = JSON.stringify({
              type: "caption",
              text: text,
              timestamp: Date.now()
            });

            for (const clientWs of this.sessions) {
              try {
                clientWs.send(payload);
              } catch (e) {
                this.sessions.delete(clientWs);
              }
            }
          }
        }
      } catch (err) {
        console.error("Whisper Workers AI WebSocket Stream Error:", err);
      }
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    this.sessions.delete(ws);
  }

  async webSocketError(ws, error) {
    this.sessions.delete(ws);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route audio & websocket traffic to singleton Durable Object instance
    if (url.pathname.startsWith("/api/") || request.headers.get("Upgrade") === "websocket") {
      const id = env.CAPTION_DO.idFromName("global_caption_room");
      const stub = env.CAPTION_DO.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
