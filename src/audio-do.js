const PROFANITY_PATTERN = /\b(fuck|fucking|fucker|fck|shit|shitting|bullshit|damn|dammit|hell|bitch|bastard|ass|asshole|crap|piss|dick|cock|pussy|cunt|slut|whore|nigger|nigga|faggot|retard)\b/i;

const BANNED_HALLUCINATIONS = [
  "thank you for watching",
  "thanks for watching",
  "please subscribe",
  "subscribe to our channel",
  "subtitles by",
  "transcript by",
  "translated by",
  "amara.org",
  "you're watching",
  "please like and subscribe",
  "see you next time",
  "the end.",
  "captioned by",
  "scribie.com",
  "copyright",
  "all rights reserved",
  "www.",
  "subtitles created by",
  "watching",
  "like and subscribe",
  "world",
  "1.5%",
  "1.5%;"
];

const PHANTOM_NOISE_TOKENS = new Set([
  "world", "you", "thanks", "bye", "watching", "subscribe", "subtitles", "yeah", "yes", "no",
  "amen", "hello", "hey", "okay", "so", "and", "the", "a", "1.5%", "1.5%;", "1.5"
]);

function isHallucinationOrProfane(text) {
  if (!text) return true;
  let clean = text.trim();
  if (clean.length === 0) return true;

  // Drop noise symbols, code, percentages, math, and non-English scripts
  if (/[~♪♫\[\]\(\)\*<>_{}\\]/.test(clean)) return true;
  if (/[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/.test(clean)) return true;
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(clean)) return true;
  if (/[\u0400-\u04FF\u0600-\u06FF\u0590-\u05FF]/.test(clean)) return true;

  // Reject punctuation-heavy, math, percent, or code artifacts (e.g. '1.5%;')
  if (/^[\d\s\.\,\%\;\:\-\_\$\#\@\!\?\(\)\[\]\{\}\/\\\|~`"'+=]+$/.test(clean)) return true;
  if (!/[a-zA-Z]{2,}/.test(clean)) return true;

  // Profanity filter
  if (PROFANITY_PATTERN.test(clean)) return true;

  // Common Whisper silence hallucinations
  const lower = clean.toLowerCase();
  const stripped = lower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, "").replace(/\s+/g, ' ').trim();

  if (BANNED_HALLUCINATIONS.some(p => stripped === p || stripped.startsWith(p + " ") || stripped.endsWith(" " + p))) return true;

  // Reject single isolated phantom noise words emitted during silence pauses
  const words = stripped.split(/\s+/);
  if (words.length === 1 && PHANTOM_NOISE_TOKENS.has(words[0])) return true;

  // Character repetition loops (e.g. 'aaaaa')
  if (/(.)\1{4,}/.test(clean)) return true;

  return false;
}

const BIBLICAL_REPLACEMENTS = [
  // Names of God, Christ & The Trinity
  [/\bjesus christ\b/gi, "Jesus Christ"],
  [/\bjesus\b/gi, "Jesus"],
  [/\bchrist\b/gi, "Christ"],
  [/\bholy spirit\b/gi, "Holy Spirit"],
  [/\bholy ghost\b/gi, "Holy Ghost"],
  [/\bthe lord\b/gi, "the Lord"],
  [/\bour lord\b/gi, "our Lord"],
  [/\blord god\b/gi, "Lord God"],
  [/\byahweh\b/gi, "Yahweh"],
  [/\bjehovah\b/gi, "Jehovah"],
  [/\bmessiah\b/gi, "Messiah"],
  [/\bsavior\b/gi, "Savior"],
  [/\balmighty god\b/gi, "Almighty God"],
  [/\bking of kings\b/gi, "King of Kings"],
  [/\blord of lords\b/gi, "Lord of Lords"],

  // Books of the Bible (Numbered)
  [/\b(1st|first)\s+samuel\b/gi, "1 Samuel"],
  [/\b(2nd|second)\s+samuel\b/gi, "2 Samuel"],
  [/\b(1st|first)\s+kings\b/gi, "1 Kings"],
  [/\b(2nd|second)\s+kings\b/gi, "2 Kings"],
  [/\b(1st|first)\s+chronicles\b/gi, "1 Chronicles"],
  [/\b(2nd|second)\s+chronicles\b/gi, "2 Chronicles"],
  [/\b(1st|first)\s+corinthians\b/gi, "1 Corinthians"],
  [/\b(2nd|second)\s+corinthians\b/gi, "2 Corinthians"],
  [/\b(1st|first)\s+thessalonians\b/gi, "1 Thessalonians"],
  [/\b(2nd|second)\s+thessalonians\b/gi, "2 Thessalonians"],
  [/\b(1st|first)\s+timothy\b/gi, "1 Timothy"],
  [/\b(2nd|second)\s+timothy\b/gi, "2 Timothy"],
  [/\b(1st|first)\s+peter\b/gi, "1 Peter"],
  [/\b(2nd|second)\s+peter\b/gi, "2 Peter"],
  [/\b(1st|first)\s+john\b/gi, "1 John"],
  [/\b(2nd|second)\s+john\b/gi, "2 John"],
  [/\b(3rd|third)\s+john\b/gi, "3 John"],

  // Books of the Bible (Canonical)
  [/\bgenesis\b/gi, "Genesis"],
  [/\bexodus\b/gi, "Exodus"],
  [/\bleviticus\b/gi, "Leviticus"],
  [/\bdeuteronomy\b/gi, "Deuteronomy"],
  [/\bjoshua\b/gi, "Joshua"],
  [/\bjudges\b/gi, "Judges"],
  [/\bruth\b/gi, "Ruth"],
  [/\bnehemiah\b/gi, "Nehemiah"],
  [/\besther\b/gi, "Esther"],
  [/\bpsalms\b/gi, "Psalms"],
  [/\bpsalm\b/gi, "Psalm"],
  [/\bproverbs\b/gi, "Proverbs"],
  [/\becclesiastes\b/gi, "Ecclesiastes"],
  [/\bsong of solomon\b/gi, "Song of Solomon"],
  [/\bisaiah\b/gi, "Isaiah"],
  [/\bjeremiah\b/gi, "Jeremiah"],
  [/\blamentations\b/gi, "Lamentations"],
  [/\bezekiel\b/gi, "Ezekiel"],
  [/\bdaniel\b/gi, "Daniel"],
  [/\bhosea\b/gi, "Hosea"],
  [/\bmatthew\b/gi, "Matthew"],
  [/\bromans\b/gi, "Romans"],
  [/\bgalatians\b/gi, "Galatians"],
  [/\bephesians\b/gi, "Ephesians"],
  [/\bphilippians\b/gi, "Philippians"],
  [/\bcolossians\b/gi, "Colossians"],
  [/\bphilemon\b/gi, "Philemon"],
  [/\bhebrews\b/gi, "Hebrews"],
  [/\brevelation\b/gi, "Revelation"],

  // Major Biblical Figures & Places
  [/\babraham\b/gi, "Abraham"],
  [/\bisaac\b/gi, "Isaac"],
  [/\bjacob\b/gi, "Jacob"],
  [/\bmoses\b/gi, "Moses"],
  [/\bdavid\b/gi, "David"],
  [/\bsolomon\b/gi, "Solomon"],
  [/\belijah\b/gi, "Elijah"],
  [/\belisha\b/gi, "Elisha"],
  [/\bjohn the baptist\b/gi, "John the Baptist"],
  [/\bapostle paul\b/gi, "Apostle Paul"],
  [/\bapostle peter\b/gi, "Apostle Peter"],
  [/\blazarus\b/gi, "Lazarus"],
  [/\bnicodemus\b/gi, "Nicodemus"],
  [/\bcalvary\b/gi, "Calvary"],
  [/\bbaptist\b/gi, "Baptist"],
  [/\bjerusalem\b/gi, "Jerusalem"],
  [/\bbethlehem\b/gi, "Bethlehem"],
  [/\bnazareth\b/gi, "Nazareth"],
  [/\bgolgotha\b/gi, "Golgotha"],
  [/\bgethsemane\b/gi, "Gethsemane"],
  [/\bbabylon\b/gi, "Babylon"],
  [/\bisrael\b/gi, "Israel"],
  [/\bking james\b/gi, "King James"],

  // Theological & Church Vocabulary Homophone Corrections
  [/\bthe scripture\b/gi, "the Scripture"],
  [/\bthe scriptures\b/gi, "the Scriptures"],
  [/\bthe gospel\b/gi, "the Gospel"],
  [/\bthe resurrection\b/gi, "the Resurrection"],
  [/\bthe crucifixion\b/gi, "the Crucifixion"],
  [/\bold testament\b/gi, "Old Testament"],
  [/\bnew testament\b/gi, "New Testament"],
  [/\bthe altar\b/gi, "the altar"],
  [/\bthe altars\b/gi, "the altars"],
  [/\baltar call\b/gi, "altar call"]
];

// Regex to format spoken scripture references (e.g. "John 3 16" -> "John 3:16", "Romans 8 28" -> "Romans 8:28")
const SCRIPTURE_REF_PATTERN = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Psalm|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(\d{1,3})\s+(\d{1,3})\b/g;

function formatCaption(text) {
  if (!text) return "";
  let clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return "";

  // Apply Biblical and Theological Dictionary Replacements
  for (const [pattern, replacement] of BIBLICAL_REPLACEMENTS) {
    clean = clean.replace(pattern, replacement);
  }

  // Format Chapter & Verse (e.g., "John 3 16" -> "John 3:16")
  clean = clean.replace(SCRIPTURE_REF_PATTERN, "$1 $2:$3");

  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (clean.endsWith(',')) clean = clean.slice(0, -1);
  return clean;
}

const MIN_CHUNK_BYTES = 112000; // ~3.5s of continuous speech for natural sentence chunking
const PAUSE_DEBOUNCE_MS = 850;   // 850ms natural breath / pause flush
const MIN_PAUSE_BYTES = 8000;    // Flush on pause if at least 0.25s audio accumulated

export class CaptionDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.audioChunks = [];
    this.lastTranscription = "";
    this.lastTranscriptionTime = 0;
    this.isFlushing = false;
    this.inactivityTimer = null;
    this.currentMode = "sermon"; // "sermon" or "worship"
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      server.send(JSON.stringify({
        type: "status",
        text: "Connected to Spoken Light Edge",
        mode: this.currentMode
      }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/api/stats") {
      const sockets = this.state.getWebSockets ? this.state.getWebSockets().length : 0;
      return new Response(JSON.stringify({
        mode: this.currentMode,
        activeSockets: sockets
      }, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response("Spoken Light Edge DO", { status: 200 });
  }

  broadcast(payload) {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload);
    const sockets = this.state.getWebSockets ? this.state.getWebSockets() : [];
    for (const socket of sockets) {
      try { socket.send(str); } catch (e) {}
    }
  }

  async webSocketMessage(ws, message) {
    if (typeof message === "string") {
      if (message === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        return;
      }

      try {
        const cmd = JSON.parse(message);
        if (cmd.type === "set_mode") {
          this.currentMode = cmd.mode === "worship" ? "worship" : "sermon";
          if (this.currentMode === "worship") {
            this.audioChunks = [];
            this.lastTranscription = "";
            this.broadcast({ type: "clear", reason: "worship_mode" });
          }
          this.broadcast({ type: "mode_change", mode: this.currentMode });
          return;
        }

        if (cmd.type === "test_caption") {
          const testText = cmd.text || "This is a live test broadcast subtitle from Spoken Light.";
          this.broadcast({ type: "caption", text: testText, timestamp: Date.now() });
          return;
        }

        if (cmd.type === "clear") {
          this.lastTranscription = "";
          this.broadcast({ type: "clear", reason: "manual" });
          return;
        }
      } catch (e) {}
      return;
    }

    // Audio stream message: ignore if in worship mode
    if (this.currentMode === "worship") return;

    if (message instanceof ArrayBuffer || message instanceof Uint8Array || ArrayBuffer.isView(message)) {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }

      this.audioChunks.push(new Uint8Array(message));
      const totalBytes = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);

      // Continuous speech chunk trigger
      if (totalBytes >= MIN_CHUNK_BYTES && !this.isFlushing) {
        await this.flushToWhisper();
      } else if (totalBytes >= MIN_PAUSE_BYTES && !this.isFlushing) {
        // Natural pause/breath debounce
        this.inactivityTimer = setTimeout(async () => {
          if (!this.isFlushing && this.audioChunks.length > 0) {
            await this.flushToWhisper();
          }
        }, PAUSE_DEBOUNCE_MS);
      }
    }
  }

  async webSocketClose(ws) {}
  async webSocketError(ws) {}

  async flushToWhisper() {
    if (this.audioChunks.length === 0 || this.isFlushing || this.currentMode === "worship") return;

    this.isFlushing = true;

    try {
      const totalBytes = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (totalBytes < 8000) {
        this.isFlushing = false;
        return;
      }

      const pcmData = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        pcmData.set(chunk, offset);
        offset += chunk.length;
      }

      // Calculate RMS energy and peak amplitude of the accumulated audio buffer
      const int16View = new Int16Array(pcmData.buffer, pcmData.byteOffset, Math.floor(pcmData.byteLength / 2));
      let sumSq = 0;
      let maxAmp = 0;
      for (let i = 0; i < int16View.length; i++) {
        const val = int16View[i];
        sumSq += val * val;
        const abs = Math.abs(val);
        if (abs > maxAmp) maxAmp = abs;
      }
      const rms = Math.sqrt(sumSq / int16View.length);

      // SILENCE REJECTION GATE: If energy is below ambient room noise floor (speaker stopped talking), drop buffer and DO NOT call Whisper!
      if (rms < 320 || maxAmp < 450) {
        this.audioChunks = [];
        this.isFlushing = false;
        return;
      }

      // Retain 250ms trailing acoustic overlap (8,000 bytes) for boundary continuity
      const overlapBytes = Math.min(8000, pcmData.length);
      const overlapChunk = pcmData.slice(pcmData.length - overlapBytes);
      this.audioChunks = [overlapChunk];

      // Dynamic peak gain normalization to boost soft speech to optimal Whisper volume (80% full scale)
      if (maxAmp > 300 && maxAmp < 22000) {
        const gain = Math.min(8.0, 22000 / maxAmp);
        for (let i = 0; i < int16View.length; i++) {
          int16View[i] = Math.max(-32768, Math.min(32767, Math.round(int16View[i] * gain)));
        }
      }

      // Prepend 200ms (6,400 bytes) of lead-in padding for clean phoneme attack
      const leadInBytes = 6400;
      const totalPcmBytes = leadInBytes + pcmData.length;

      const wavBuffer = new Uint8Array(44 + totalPcmBytes);
      const view = new DataView(wavBuffer.buffer);

      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + totalPcmBytes, true);
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
      view.setUint32(40, totalPcmBytes, true);
      wavBuffer.set(pcmData, 44 + leadInBytes);

      const audioArray = Array.from(wavBuffer);

      let response;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 750));
      
      // Lazily fetch D1 Semantic Lexicon Context on first execution
      if (!this.d1Context) {
        try {
          const res = await this.env.DB.prepare("SELECT context_string FROM context LIMIT 1").first();
          this.d1Context = res ? res.context_string : "Gospel, Christ, Bible";
        } catch (e) {
          this.d1Context = "Gospel, Christ, Bible";
        }
      }

      // Build context string combining D1 Lexicon + trailing transcription overlap
      const aiPrompt = `Context: ${this.d1Context}. ${this.lastTranscription ? this.lastTranscription.slice(-200) : ""}`;

      try {
        // Primary Edge Inference: Large V3 Turbo with 750ms Latency Circuit Breaker
        response = await Promise.race([
          this.env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio: audioArray, initial_prompt: aiPrompt }),
          timeoutPromise
        ]);
      } catch (e1) {
        // Circuit Breaker Tripped: Fallback to base model for latency preservation
        response = await this.env.AI.run("@cf/openai/whisper", { audio: audioArray, initial_prompt: aiPrompt });
      }

function stripSentenceOverlap(prev, next) {
  if (!prev || !next) return next;
  const prevWords = prev.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
  const nextWords = next.split(/\s+/);
  if (prevWords.length === 0 || nextWords.length === 0) return next;

  const maxCheck = Math.min(4, Math.min(prevWords.length, nextWords.length));
  for (let n = maxCheck; n >= 1; n--) {
    const prevTail = prevWords.slice(prevWords.length - n).join(' ');
    const nextHead = nextWords.slice(0, n).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');
    if (prevTail === nextHead) {
      const stripped = nextWords.slice(n).join(' ').trim();
      if (stripped.length > 0) {
        return stripped.charAt(0).toUpperCase() + stripped.slice(1);
      }
    }
  }
  return next;
}

      if (response && response.text) {
        const rawText = response.text.trim();
        if (!isHallucinationOrProfane(rawText)) {
          let captionText = formatCaption(rawText);
          captionText = stripSentenceOverlap(this.lastTranscription, captionText);

          const now = Date.now();
          const isImmediateDuplicate = (
            captionText.toLowerCase() === (this.lastTranscription || "").toLowerCase() &&
            (now - this.lastTranscriptionTime) < 3000
          );

          if (!isImmediateDuplicate && captionText.length > 0) {
            this.lastTranscription = captionText;
            this.lastTranscriptionTime = now;
            this.broadcast({
              type: "caption",
              text: captionText,
              timestamp: now
            });
          }
        }
      }
    } catch (err) {
      console.error("Whisper Error:", err);
    } finally {
      this.isFlushing = false;
      const remainingBytes = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (remainingBytes >= MIN_CHUNK_BYTES) {
        this.flushToWhisper();
      }
    }
  }
}

const CSP_POLICY = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src 'self' wss: ws: https: blob: https://*.cloudflareinsights.com https://spokenlight.dondlingergc.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: https://static.cloudflareinsights.com https://spokenlight.dondlingergc.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; media-src 'self' blob:; font-src 'self' data: https:;";

function sanitizeResponseHeaders(response) {
  if (response.status === 101 || response.webSocket) {
    return response;
  }
  const newHeaders = new Headers(response.headers);
  newHeaders.delete("Content-Security-Policy-Report-Only");
  newHeaders.set("Content-Security-Policy", CSP_POLICY);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  newHeaders.set("Pragma", "no-cache");
  newHeaders.set("Expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") === "websocket" || url.pathname.startsWith("/api/")) {
      const id = env.CAPTION_DO.idFromName("global_caption_room");
      const stub = env.CAPTION_DO.get(id);
      const res = await stub.fetch(request);
      return sanitizeResponseHeaders(res);
    }

    const assetRes = await env.ASSETS.fetch(request);
    return sanitizeResponseHeaders(assetRes);
  }
};
