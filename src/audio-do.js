export class CaptionDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.audioChunks = [];
    this.lastTranscription = "";
    this.flushInterval = null;

    // Initialize or restore persistent telemetry state
    this.state.blockConcurrencyWhile(async () => {
      this.totalStarts = (await this.state.storage.get("totalStarts")) || 0;
      this.totalRequests = (await this.state.storage.get("totalRequests")) || 0;
      this.totalAiFlushes = (await this.state.storage.get("totalAiFlushes")) || 0;
      this.lastStartedAt = (await this.state.storage.get("lastStartedAt")) || null;
      this.recentCaptions = (await this.state.storage.get("recentCaptions")) || [];

      // Increment DO instantiation count
      this.totalStarts++;
      this.lastStartedAt = new Date().toISOString();
      await this.state.storage.put("totalStarts", this.totalStarts);
      await this.state.storage.put("lastStartedAt", this.lastStartedAt);
    });
  }

  isAuthorizedExecution(requestUrl, requestHeaders) {
    const url = new URL(requestUrl);
    const adminKey = url.searchParams.get("admin_key") || requestHeaders.get("X-Admin-Key");
    if (adminKey === "469airportave_jd_permission") {
      return true;
    }
    
    // Explicitly calculate day of week in America/Chicago timezone
    const chicagoDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(new Date());
    return chicagoDay === "Sun";
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Track total incoming request counter
    this.totalRequests++;
    await this.state.storage.put("totalRequests", this.totalRequests);

    // Return Telemetry Stats Endpoint
    if (url.pathname === "/api/stats") {
      const stats = {
        totalStarts: this.totalStarts,
        totalRequests: this.totalRequests,
        totalAiFlushes: this.totalAiFlushes,
        lastStartedAt: this.lastStartedAt,
        activeWebSockets: this.sessions.size,
        recentCaptions: this.recentCaptions
      };
      return new Response(JSON.stringify(stats, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!this.isAuthorizedExecution(request.url, request.headers)) {
      return new Response(
        JSON.stringify({ error: "Execution blocked. System is scheduled for Sunday operations only, or requires valid admin_key." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // Direct day double-check safeguard in Chicago timezone before triggering Workers AI spend
    const chicagoDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(new Date());
    if (chicagoDay !== "Sun" && !this.overrideActive) {
      // If triggered on non-Sunday without explicit admin key, clear queue
      this.audioChunks = [];
      return;
    }

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

      // 4. Run Workers AI Whisper Inference with Array.from byte numbers
      const response = await this.env.AI.run("@cf/openai/whisper-large-v3-turbo", {
        audio: Array.from(wavBuffer),
        initial_prompt: this.lastTranscription.slice(-200)
      });

      this.totalAiFlushes++;
      await this.state.storage.put("totalAiFlushes", this.totalAiFlushes);

      if (response && response.text) {
        const captionText = response.text.trim();
        if (captionText.length > 0) {
          this.lastTranscription = captionText;

          // Maintain rolling recent 10 captions in persistent storage
          this.recentCaptions.unshift({ text: captionText, timestamp: new Date().toISOString() });
          if (this.recentCaptions.length > 10) this.recentCaptions.pop();
          await this.state.storage.put("recentCaptions", this.recentCaptions);

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

    // Route audio, websocket, and stats traffic to singleton Durable Object instance
    if (url.pathname.startsWith("/api/") || request.headers.get("Upgrade") === "websocket") {
      const id = env.CAPTION_DO.idFromName("global_caption_room");
      const stub = env.CAPTION_DO.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
