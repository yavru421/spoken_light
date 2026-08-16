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
        const input = {
          audio: Array.from(this.slidingBuffer),
          initial_prompt: this.contextPrompt
        };

        const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", input);

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
    // Handle WebSocket inbound messages if needed (e.g. control commands)
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
