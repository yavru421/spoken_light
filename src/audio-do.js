export class CaptionDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.audioChunks = [];
    this.lastTranscription = "";
    this.flushInterval = null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket Upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);
      this.sessions.add(server);
      this.startLoop();

      return new Response(null, { status: 101, webSocket: client });
    }

    // Audio POST Ingestion Endpoint
    if (request.method === "POST" && url.pathname === "/api/audio") {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        this.audioChunks.push(new Uint8Array(buffer));
        this.startLoop();
      }
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Spoken Light Audio DurableObject", { status: 200 });
  }

  startLoop() {
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => this.flushToWhisper(), 4000);
    }
  }

  async webSocketMessage(ws, message) {
    if (message instanceof ArrayBuffer || message instanceof Uint8Array || ArrayBuffer.isView(message)) {
      this.audioChunks.push(new Uint8Array(message));
      this.startLoop();
    }
  }

  async webSocketClose(ws) {
    this.sessions.delete(ws);
    if (this.sessions.size === 0 && this.audioChunks.length === 0) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  async webSocketError(ws) {
    this.sessions.delete(ws);
  }

  async flushToWhisper() {
    if (this.audioChunks.length === 0) return;

    // 1. Flatten all accumulated raw PCM chunks
    const totalBytes = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcmData = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      pcmData.set(chunk, offset);
      offset += chunk.length;
    }

    // 2. Retain trailing 20% of samples for sliding window overlap
    const keepOffset = Math.floor(totalBytes * 0.8);
    const retainedChunk = pcmData.slice(keepOffset);
    this.audioChunks = [retainedChunk];

    try {
      // 3. Prepend 44-byte RIFF/WAV Header (16kHz 16-bit Mono PCM)
      const wavBuffer = new Uint8Array(44 + pcmData.length);
      const view = new DataView(wavBuffer.buffer);

      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + pcmData.length, true);
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, 16000, true); // 16kHz
      view.setUint32(28, 32000, true); // Byte rate
      view.setUint16(32, 2, true); // Block align
      view.setUint16(34, 16, true); // 16-bit
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, pcmData.length, true);

      wavBuffer.set(pcmData, 44);

      // 4. Run Workers AI Whisper Inference with Array.from payload
      const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
        audio: Array.from(wavBuffer),
        initial_prompt: this.lastTranscription.slice(-200)
      });

      if (response && response.text) {
        const captionText = response.text.trim();
        if (captionText.length > 0) {
          this.lastTranscription = captionText;
          const payload = JSON.stringify({
            type: "caption",
            text: captionText,
            timestamp: Date.now()
          });

          for (const socket of this.sessions) {
            try {
              socket.send(payload);
            } catch (e) {
              this.sessions.delete(socket);
            }
          }
        }
      }
    } catch (err) {
      console.error("Workers AI Whisper Error:", err);
    }
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
