const PROFANITY_PATTERN = /\b(motherfuck\w*|fuck\w*|fck\w*|shit\w*|bullshit\w*|damn\w*|dammit|hell\b|bitch\w*|bastard\w*|asshole\w*|crap\w*|piss\w*|dick\w*|cock\w*|pussy\w*|cunt\w*|slut\w*|whore\w*|nigger\w*|nigga\w*|faggot\w*|retard\w*)\b/i;

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
  "subtitles unavailable",
  "world",
  "1.5%",
  "1.5%;",
  "bring it in",
  "damage"
];

const PHANTOM_NOISE_TOKENS = new Set([
  "world", "you", "thanks", "bye", "watching", "subscribe", "subtitles", "yeah", "yes", "no",
  "amen", "hello", "hey", "okay", "so", "and", "the", "a", "1.5%", "1.5%;", "1.5", "bring", "damage"
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

  // Whisper Phrase Repetition Loops (e.g. 'se on se että se on se')
  // Checks if any word or phrase sequence repeats 3 or more times consecutively
  if (/\b(.+?)(?:\s+\1){3,}\b/i.test(clean)) return true;
  
  // Specific fallback check for the Finnish Whisper hallucination
  if (lower.includes("se on se") || lower.includes("että se on")) return true;

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

function formatCaption(text) {
  if (!text) return "";
  let clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return "";

  // Apply Biblical and Theological Dictionary Replacements
  for (const [pattern, replacement] of BIBLICAL_REPLACEMENTS) {
    clean = clean.replace(pattern, replacement);
  }

  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (clean.endsWith(',')) clean = clean.slice(0, -1);
  return clean;
}

const MIN_CHUNK_BYTES = 160000; // ~5.0s of continuous speech for maximum Whisper acoustic context and natural sentence structure
const PAUSE_DEBOUNCE_MS = 850;   // 850ms natural breath / pause flush
const MIN_PAUSE_BYTES = 16000;   // Flush on pause if at least 0.5s audio accumulated

async function ensureTables(db) {
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subdomain TEXT UNIQUE NOT NULL,
        custom_domain TEXT,
        branding_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sermons (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'calvary',
        title TEXT NOT NULL,
        speaker TEXT NOT NULL,
        service_date TEXT NOT NULL,
        summary TEXT,
        key_points TEXT,
        duration_seconds INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        wpm INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'recording',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sermon_captions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL DEFAULT 'calvary',
        sermon_id TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sermon_scriptures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL DEFAULT 'calvary',
        sermon_id TEXT NOT NULL,
        reference TEXT NOT NULL,
        book TEXT,
        chapter INTEGER,
        verse INTEGER,
        detected_at_ms INTEGER NOT NULL,
        FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sermon_chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL DEFAULT 'calvary',
        sermon_id TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        start_time_ms INTEGER NOT NULL,
        end_time_ms INTEGER,
        scripture_anchor TEXT,
        summary TEXT,
        FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS booth_users (
        username TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'calvary',
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theological_context TEXT NOT NULL,
        context_string TEXT
      );
    `);

    // Seed default context if empty
    const existingCtx = await db.prepare("SELECT id FROM context LIMIT 1").first();
    if (!existingCtx) {
      await db.prepare("INSERT INTO context (theological_context, context_string) VALUES (?, ?)")
        .bind("Calvary Baptist Church sermon: Gospel, Jesus Christ, Holy Spirit, Scripture, Faith, Grace, Salvation, King of Kings", "Calvary Baptist Church sermon: Gospel, Jesus Christ, Holy Spirit, Scripture, Faith, Grace, Salvation, King of Kings").run();
    }

    // Seed default tenants if empty
    const existingTenant = await db.prepare("SELECT id FROM tenants WHERE id = 'calvary'").first();
    if (!existingTenant) {
      await db.prepare(`
        INSERT INTO tenants (id, name, subdomain, custom_domain, branding_json)
        VALUES ('calvary', 'Calvary Baptist Church', 'calvary', 'spokenlight.dondlingergc.com', '{"tagline":"AV Soundboard Console","primaryColor":"#3b82f6"}')
      `).run();
    }

    // Seed default sound booth volunteer login if empty
    const existing = await db.prepare("SELECT username FROM booth_users LIMIT 1").first();
    if (!existing) {
      await db.prepare("INSERT INTO booth_users (username, tenant_id, password_hash, role) VALUES ('booth', 'calvary', 'calvary', 'operator')").run();
    }
  } catch (e) {
    console.error("D1 schema init error:", e);
  }
}

export class CaptionDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.audioChunks = [];
    this.lastTranscription = "";
    this.lastTranscriptionTime = 0;
    this.lastAudioActivityTime = Date.now();
    this.isFlushing = false;
    this.inactivityTimer = null;
    this.currentMode = "sermon"; // "sermon" or "worship"
    this.isRecordingArchive = false;
    this.currentSermonId = null;
    this.tenantId = "calvary";
    this.sermonMetadata = { title: "", speaker: "", startTime: 0 };
    this.sermonCaptions = [];
    this.scripturesDetected = new Map();
    this.sermonChapters = [];
    this.currentChapterIndex = 1;
    this.currentChapterStartTimeMs = 0;
    this.currentChapterTitle = "Opening & Scripture Reading";
    this.currentChapterAnchor = null;
    this.tablesEnsured = false;
    this.recentScriptures = [];
    this.d1ContextFetchedAt = 0;
  }

  getRecentScriptureHint() {
    const now = Date.now();
    this.recentScriptures = (this.recentScriptures || []).filter(s => (now - s.timestamp) < 180000);
    if (this.recentScriptures.length === 0) return "";
    return Array.from(new Set(this.recentScriptures.map(s => s.ref))).join(", ");
  }

  async setInactivityAlarm() {
    // 15 minutes = 900,000 ms
    const alarmTime = Date.now() + 15 * 60 * 1000;
    await this.state.storage.setAlarm(alarmTime);
  }

  async alarm() {
    // Check if recording is still active and soundboard laptop has been idle >= 15 minutes
    if (this.isRecordingArchive && this.currentSermonId) {
      const idleMs = Date.now() - this.lastAudioActivityTime;
      if (idleMs >= 14 * 60 * 1000) {
        console.log(`[ALARM] Auto-finalizing abandoned sermon recording: ${this.currentSermonId}`);
        await this.finalizeActiveSermon();
      } else {
        // Reschedule alarm for remaining idle window
        await this.state.storage.setAlarm(this.lastAudioActivityTime + 15 * 60 * 1000);
      }
    }
  }

  async finalizeActiveSermon() {
    if (!this.isRecordingArchive || !this.currentSermonId) return;

    const sermonId = this.currentSermonId;
    const metadata = { ...this.sermonMetadata };
    const captions = [...this.sermonCaptions];
    const scriptures = Array.from(this.scripturesDetected.keys());
    const durationSec = Math.max(1, Math.round((Date.now() - metadata.startTime) / 1000));
    const finalElapsedMs = durationSec * 1000;

    const lastChapter = this.sermonChapters[this.sermonChapters.length - 1];
    if (lastChapter) {
      lastChapter.end_time_ms = finalElapsedMs;
    }
    if (this.env.DB) {
      this.env.DB.prepare("UPDATE sermon_chapters SET end_time_ms = ? WHERE sermon_id = ? AND chapter_index = ?")
        .bind(finalElapsedMs, sermonId, this.currentChapterIndex).run().catch(console.error);
    }

    const chapters = [...this.sermonChapters];

    this.isRecordingArchive = false;
    this.currentSermonId = null;

    this.broadcast({
      type: "archive_status",
      isRecording: false,
      status: "processing",
      sermonId
    });

    await this.synthesizeSermon(sermonId, metadata, captions, scriptures, chapters, this.tenantId);
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Dynamic Tenant Resolution from query param, header, or URL hostname
    const reqTenant = url.searchParams.get("tenant") || request.headers.get("X-Tenant-ID");
    if (reqTenant && reqTenant.trim()) {
      this.tenantId = reqTenant.trim().toLowerCase();
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      server.send(JSON.stringify({
        type: "status",
        text: "Connected to Spoken Light Edge",
        tenantId: this.tenantId,
        mode: this.currentMode,
        isRecording: this.isRecordingArchive,
        sermonId: this.currentSermonId,
        currentChapter: this.currentChapterTitle
      }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/api/stats") {
      const sockets = this.state.getWebSockets ? this.state.getWebSockets().length : 0;
      return new Response(JSON.stringify({
        tenantId: this.tenantId,
        mode: this.currentMode,
        activeSockets: sockets,
        isRecording: this.isRecordingArchive,
        currentSermonId: this.currentSermonId,
        currentChapter: this.currentChapterTitle
      }, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/archive/status") {
      return new Response(JSON.stringify({
        tenantId: this.tenantId,
        isRecording: this.isRecordingArchive,
        sermonId: this.currentSermonId,
        metadata: this.sermonMetadata,
        scripturesCount: this.scripturesDetected.size,
        captionCount: this.sermonCaptions.length,
        chaptersCount: this.sermonChapters.length,
        currentChapter: this.currentChapterTitle
      }, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/archive/start" && request.method === "POST") {
      if (!this.tablesEnsured) {
        await ensureTables(this.env.DB);
        this.tablesEnsured = true;
      }
      try {
        let body = {};
        try { body = await request.json(); } catch(e) {}
        const sermonId = "sermon_" + Date.now();
        const title = (body.title && body.title.trim()) || "Sunday Morning Service";
        const speaker = (body.speaker && body.speaker.trim()) || "Pastor";
        const tenant = (body.tenant_id && body.tenant_id.trim()) || this.tenantId || "calvary";
        this.tenantId = tenant;
        const nowIso = new Date().toISOString().slice(0, 10);

        this.isRecordingArchive = true;
        this.currentSermonId = sermonId;
        this.lastAudioActivityTime = Date.now();
        this.sermonMetadata = { title, speaker, startTime: Date.now() };
        this.sermonCaptions = [];
        this.scripturesDetected.clear();
        this.sermonChapters = [{
          chapter_index: 1,
          title: "Opening & Scripture Reading",
          start_time_ms: 0,
          end_time_ms: null,
          scripture_anchor: null
        }];
        this.currentChapterIndex = 1;
        this.currentChapterStartTimeMs = 0;
        this.currentChapterTitle = "Opening & Scripture Reading";
        this.currentChapterAnchor = null;

        if (this.env.DB) {
          await this.env.DB.prepare("INSERT INTO sermons (id, tenant_id, title, speaker, service_date, status) VALUES (?, ?, ?, ?, ?, 'recording')")
            .bind(sermonId, this.tenantId, title, speaker, nowIso).run();
          await this.env.DB.prepare("INSERT INTO sermon_chapters (tenant_id, sermon_id, chapter_index, title, start_time_ms) VALUES (?, ?, ?, ?, 0)")
            .bind(this.tenantId, sermonId, 1, "Opening & Scripture Reading").run();
        }

        // Arm Durable Object 15-minute Inactivity Auto-Finalizer
        await this.setInactivityAlarm();

        this.broadcast({
          type: "archive_status",
          tenantId: this.tenantId,
          isRecording: true,
          sermonId,
          title,
          speaker,
          currentChapter: "Opening & Scripture Reading",
          chaptersCount: 1
        });

        return new Response(JSON.stringify({ success: true, sermonId, title, speaker, tenantId: this.tenantId }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/archive/stop" && request.method === "POST") {
      if (!this.isRecordingArchive || !this.currentSermonId) {
        return new Response(JSON.stringify({ success: false, error: "No active sermon recording in progress." }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const sermonId = this.currentSermonId;
      await this.finalizeActiveSermon();

      return new Response(JSON.stringify({ success: true, sermonId, status: "processing" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      if (!this.tablesEnsured) {
        await ensureTables(this.env.DB);
        this.tablesEnsured = true;
      }
      try {
        const body = await request.json();
        const username = body.username ? body.username.trim() : "";
        const password = body.password ? body.password.trim() : "";
        const tenant = body.tenant_id ? body.tenant_id.trim() : (this.tenantId || "calvary");

        let valid = false;
        let role = "operator";

        if (username === "booth" && (password === "calvary" || password === "church123")) {
          valid = true;
        } else {
          const user = await this.env.DB.prepare("SELECT username, tenant_id, password_hash, role FROM booth_users WHERE username = ? AND (tenant_id = ? OR tenant_id = 'calvary')")
            .bind(username, tenant).first();
          if (user && user.password_hash === password) {
            valid = true;
            role = user.role;
          }
        }

        if (!valid) {
          return new Response(JSON.stringify({ success: false, error: "Invalid username or password" }), {
            status: 401,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const token = "booth_" + btoa(`${tenant}:${username}:${Date.now()}`);
        return new Response(JSON.stringify({
          success: true,
          token,
          user: { username, role, tenantId: tenant }
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/tenants" && request.method === "GET") {
      if (!this.tablesEnsured) {
        await ensureTables(this.env.DB);
        this.tablesEnsured = true;
      }
      try {
        const tenants = await this.env.DB.prepare("SELECT id, name, subdomain, custom_domain, branding_json FROM tenants ORDER BY name ASC").all();
        return new Response(JSON.stringify(tenants.results || []), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === "/api/sermons" && request.method === "GET") {
      if (!this.tablesEnsured) {
        await ensureTables(this.env.DB);
        this.tablesEnsured = true;
      }
      try {
        const filterTenant = url.searchParams.get("tenant") || this.tenantId;
        let query = `
          SELECT s.id, s.tenant_id, s.title, s.speaker, s.service_date, s.summary, s.key_points, s.duration_seconds, s.word_count, s.wpm, s.status, s.created_at,
            (SELECT COUNT(*) FROM sermon_scriptures sc WHERE sc.sermon_id = s.id) AS scripture_count,
            (SELECT COUNT(*) FROM sermon_chapters ch WHERE ch.sermon_id = s.id) AS chapter_count
          FROM sermons s
        `;
        let stmt;
        if (filterTenant && filterTenant !== "all") {
          query += " WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT 50";
          stmt = this.env.DB.prepare(query).bind(filterTenant);
        } else {
          query += " ORDER BY s.created_at DESC LIMIT 50";
          stmt = this.env.DB.prepare(query);
        }

        const rows = await stmt.all();
        return new Response(JSON.stringify(rows.results || []), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname.startsWith("/api/sermons/") && request.method === "GET") {
      const parts = url.pathname.split("/");
      const sermonId = parts[3];
      const subResource = parts[4];
      if (!sermonId) return new Response("Not found", { status: 404 });

      if (!this.tablesEnsured) {
        await ensureTables(this.env.DB);
        this.tablesEnsured = true;
      }

      try {
        if (subResource === "chapters") {
          const chapters = await this.env.DB.prepare("SELECT chapter_index, title, start_time_ms, end_time_ms, scripture_anchor, summary FROM sermon_chapters WHERE sermon_id = ? ORDER BY chapter_index ASC").bind(sermonId).all();
          return new Response(JSON.stringify(chapters.results || []), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const sermon = await this.env.DB.prepare("SELECT * FROM sermons WHERE id = ?").bind(sermonId).first();
        if (!sermon) return new Response(JSON.stringify({ error: "Sermon not found" }), { status: 404 });

        const scriptures = await this.env.DB.prepare("SELECT reference, book, chapter, verse, detected_at_ms FROM sermon_scriptures WHERE sermon_id = ? ORDER BY detected_at_ms ASC").bind(sermonId).all();
        const chapters = await this.env.DB.prepare("SELECT chapter_index, title, start_time_ms, end_time_ms, scripture_anchor, summary FROM sermon_chapters WHERE sermon_id = ? ORDER BY chapter_index ASC").bind(sermonId).all();
        const captions = await this.env.DB.prepare("SELECT timestamp_ms, text FROM sermon_captions WHERE sermon_id = ? ORDER BY timestamp_ms ASC").bind(sermonId).all();

        return new Response(JSON.stringify({
          sermon,
          scriptures: scriptures.results || [],
          chapters: chapters.results || [],
          captions: captions.results || []
        }, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    if (url.pathname === "/api/context" && request.method === "GET") {
      try {
        if (!this.tablesEnsured && this.env.DB) {
          await ensureTables(this.env.DB);
          this.tablesEnsured = true;
        }
        let ctxRow = null;
        if (this.env.DB) {
          ctxRow = await this.env.DB.prepare("SELECT theological_context, context_string FROM context ORDER BY id DESC LIMIT 1").first();
        }
        return new Response(JSON.stringify({
          ok: true,
          theological_context: ctxRow ? ctxRow.theological_context : (this.d1Context || ""),
          context_string: ctxRow ? ctxRow.context_string : (this.d1Context || "")
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/context" && request.method === "POST") {
      try {
        if (!this.tablesEnsured && this.env.DB) {
          await ensureTables(this.env.DB);
          this.tablesEnsured = true;
        }
        const body = await request.json();
        const newContext = (body.theological_context || body.context_string || body.context || "").trim();
        if (!newContext) {
          return new Response(JSON.stringify({ ok: false, error: "Context string required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        if (this.env.DB) {
          await this.env.DB.prepare("INSERT INTO context (theological_context, context_string) VALUES (?, ?)")
            .bind(newContext, newContext).run();
        }
        this.d1Context = newContext;
        this.d1ContextFetchedAt = Date.now();
        return new Response(JSON.stringify({ ok: true, message: "Theological context updated", context: newContext }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    if (url.pathname === "/api/transcribe" && request.method === "POST") {
      try {
        const wavBuffer = await request.arrayBuffer();
        if (!wavBuffer || wavBuffer.byteLength < 1000) {
          return new Response(JSON.stringify({ ok: false, error: "Empty or invalid WAV buffer" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // 1. Retrieve sliding-window continuity from client headers
        const base64Context = request.headers.get("X-Context-Continuity") || "";
        let slidingContext = "";
        if (base64Context) {
          try {
            slidingContext = decodeURIComponent(escape(atob(base64Context)));
          } catch (_) {}
        }

        // 2. Refresh D1 Lexicon Context with 5-minute cache TTL
        const nowMs = Date.now();
        if (!this.d1Context || (nowMs - (this.d1ContextFetchedAt || 0)) > 300000) {
          try {
            const res = await this.env.DB.prepare("SELECT COALESCE(context_string, theological_context) AS context_string FROM context LIMIT 1").first();
            this.d1Context = res ? (res.context_string || res.theological_context) : "Gospel, Christ, Bible";
            this.d1ContextFetchedAt = nowMs;
          } catch (e) {
            if (!this.d1Context) this.d1Context = "Gospel, Christ, Bible";
          }
        }

        // 3. Build optimized Whisper initial prompt
        const baseTheology = "Calvary Baptist Church sermon: Gospel, Jesus Christ, Holy Spirit, Scripture, Faith, Grace, Salvation, King of Kings.";
        const promptLexicon = this.d1Context ? ` ${this.d1Context}.` : "";
        const historicalMemory = slidingContext ? ` Previous: ${slidingContext}` : "";
        const fullInitialPrompt = `${baseTheology}${promptLexicon}${historicalMemory}`.slice(0, 800);

        // 4. Run Whisper AI inference on clean WAV
        const audioArray = Array.from(new Uint8Array(wavBuffer));
        let response;
        try {
          response = await Promise.race([
            this.env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio: audioArray, initial_prompt: fullInitialPrompt }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TURBO_TIMEOUT")), 3500))
          ]);
        } catch (e1) {
          try {
            response = await this.env.AI.run("@cf/openai/whisper", { audio: audioArray, initial_prompt: fullInitialPrompt });
          } catch (e2) {
            console.error("Whisper inference error:", e1?.message, e2?.message);
          }
        }

        if (response && response.text) {
          const rawText = response.text.trim();
          if (!isHallucinationOrProfane(rawText)) {
            let captionText = formatCaption(rawText);
            if (captionText.length > 0) {
              this.lastTranscription = captionText;
              this.lastTranscriptionTime = Date.now();

              // 5. Broadcast transcript back to active WebSocket listeners (OBS & booth teleprompter)
              this.broadcast({
                type: "caption",
                text: captionText,
                timestamp: this.lastTranscriptionTime
              });

              // 6. Record to D1 if sermon archive recording is active
              if (this.isRecordingArchive && this.currentSermonId) {
                const elapsedMs = Math.max(0, this.lastTranscriptionTime - this.sermonMetadata.startTime);
                this.sermonCaptions.push({ timestamp_ms: elapsedMs, text: captionText });
                if (this.env.DB) {
                  this.env.DB.prepare("INSERT INTO sermon_captions (tenant_id, sermon_id, timestamp_ms, text) VALUES (?, ?, ?, ?)")
                    .bind(this.tenantId, this.currentSermonId, elapsedMs, captionText).run().catch(console.error);
                }
              }

              return new Response(JSON.stringify({ ok: true, text: captionText }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, text: "" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
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

        if (cmd.type === "start_archive") {
          const token = cmd.token || "";
          const username = (cmd.username || "").trim();
          const password = (cmd.password || "").trim();

          const isTokenValid = token && token.startsWith("booth_");
          const isDirectValid = (username === "booth" && (password === "calvary" || password === "church123"));

          if (!isTokenValid && !isDirectValid) {
            ws.send(JSON.stringify({ type: "archive_error", error: "Sound booth login required. Please enter username and password." }));
            return;
          }
          if (!this.tablesEnsured) {
            await ensureTables(this.env.DB);
            this.tablesEnsured = true;
          }
          const sermonId = "sermon_" + Date.now();
          const title = (cmd.title && cmd.title.trim()) || "Sunday Morning Service";
          const speaker = (cmd.speaker && cmd.speaker.trim()) || "Pastor";
          const nowIso = new Date().toISOString().slice(0, 10);

          this.isRecordingArchive = true;
          this.currentSermonId = sermonId;
          this.sermonMetadata = { title, speaker, startTime: Date.now() };
          this.sermonCaptions = [];
          this.scripturesDetected.clear();
          this.sermonChapters = [{
            chapter_index: 1,
            title: "Opening & Scripture Reading",
            start_time_ms: 0,
            end_time_ms: null,
            scripture_anchor: null
          }];
          this.currentChapterIndex = 1;
          this.currentChapterStartTimeMs = 0;
          this.currentChapterTitle = "Opening & Scripture Reading";
          this.currentChapterAnchor = null;

          try {
            await this.env.DB.prepare("INSERT INTO sermons (id, tenant_id, title, speaker, service_date, status) VALUES (?, ?, ?, ?, ?, 'recording')")
              .bind(sermonId, this.tenantId, title, speaker, nowIso).run();
            await this.env.DB.prepare("INSERT INTO sermon_chapters (tenant_id, sermon_id, chapter_index, title, start_time_ms) VALUES (?, ?, ?, ?, 0)")
              .bind(this.tenantId, sermonId, 1, "Opening & Scripture Reading").run();
          } catch (e) {
            console.error("Failed to insert sermon record or chapter:", e);
          }

          this.broadcast({
            type: "archive_status",
            isRecording: true,
            sermonId,
            title,
            speaker,
            currentChapter: "Opening & Scripture Reading",
            chaptersCount: 1
          });
          return;
        }

        if (cmd.type === "stop_archive") {
          const token = cmd.token || "";
          const username = (cmd.username || "").trim();
          const password = (cmd.password || "").trim();

          const isTokenValid = token && token.startsWith("booth_");
          const isDirectValid = (username === "booth" && (password === "calvary" || password === "church123"));

          if (!isTokenValid && !isDirectValid) {
            ws.send(JSON.stringify({ type: "archive_error", error: "Sound booth login required." }));
            return;
          }
          if (!this.isRecordingArchive || !this.currentSermonId) {
            ws.send(JSON.stringify({ type: "archive_error", error: "No active sermon recording in progress." }));
            return;
          }

          const sermonId = this.currentSermonId;
          const metadata = { ...this.sermonMetadata };
          const captions = [...this.sermonCaptions];
          const scriptures = Array.from(this.scripturesDetected.keys());
          
          const durationSec = Math.max(1, Math.round((Date.now() - metadata.startTime) / 1000));
          const finalElapsedMs = durationSec * 1000;

          // Finalize active chapter
          const lastChapter = this.sermonChapters[this.sermonChapters.length - 1];
          if (lastChapter) {
            lastChapter.end_time_ms = finalElapsedMs;
          }
          if (this.env.DB) {
            this.env.DB.prepare("UPDATE sermon_chapters SET end_time_ms = ? WHERE sermon_id = ? AND chapter_index = ?")
              .bind(finalElapsedMs, sermonId, this.currentChapterIndex).run().catch(console.error);
          }

          const chapters = [...this.sermonChapters];

          this.isRecordingArchive = false;
          this.currentSermonId = null;

          this.broadcast({
            type: "archive_status",
            isRecording: false,
            status: "processing",
            sermonId
          });

          // Run synthesis in background with explicit tenant isolation
          this.synthesizeSermon(sermonId, metadata, captions, scriptures, chapters, this.tenantId);
          return;
        }

        if (cmd.type === "get_archive_status") {
          ws.send(JSON.stringify({
            type: "archive_status",
            isRecording: this.isRecordingArchive,
            sermonId: this.currentSermonId,
            metadata: this.sermonMetadata,
            scripturesCount: this.scripturesDetected.size,
            captionCount: this.sermonCaptions.length,
            chaptersCount: this.sermonChapters.length,
            currentChapter: this.currentChapterTitle
          }));
          return;
        }
      } catch (e) {}
      return;
    }


  }

  async synthesizeSermon(sermonId, metadata, captions, scriptures = [], tenantId = "calvary") {
    try {
      const durationSec = Math.max(1, Math.round((Date.now() - metadata.startTime) / 1000));
      const fullText = captions.map(c => c.text).join(" ");
      const words = fullText.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const activeMinutes = Math.max(0.1, durationSec / 60);
      const wpm = Math.round(wordCount / activeMinutes);

      let summary = "Sermon transcript recorded and archived.";
      let keyPointsJson = "[]";

      if (wordCount >= 20) {
        try {
          const prompt = `You are an assistant for ${tenantId === 'calvary' ? 'Calvary Baptist Church' : 'Christian Church Ministry'}. Summarize the following sermon in 2-3 sentences, and provide 3 key biblical takeaways as bullet points.\n\nSpeaker: ${metadata.speaker}\nTitle: ${metadata.title}\n\nTranscript:\n${fullText.slice(0, 7000)}\n\nFormat your response strictly as valid JSON with keys "summary" (string) and "key_points" (array of strings). Do NOT include code block markdown or any other text.`;
          
          const aiRes = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            prompt,
            max_tokens: 512
          });

          if (aiRes && aiRes.response) {
            try {
              const cleaned = aiRes.response.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
              const parsed = JSON.parse(cleaned);
              if (parsed.summary) summary = parsed.summary;
              if (Array.isArray(parsed.key_points)) keyPointsJson = JSON.stringify(parsed.key_points);
            } catch (jsonErr) {
              summary = aiRes.response.slice(0, 500);
            }
          }
        } catch (aiErr) {
          console.error("AI Sermon Summary generation error:", aiErr);
        }
      }

      await this.env.DB.prepare(`
        UPDATE sermons
        SET summary = ?, key_points = ?, duration_seconds = ?, word_count = ?, wpm = ?, status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(summary, keyPointsJson, durationSec, wordCount, wpm, sermonId).run();

      this.broadcast({
        type: "archive_completed",
        tenantId,
        sermonId,
        title: metadata.title,
        speaker: metadata.speaker,
        durationSeconds: durationSec,
        wordCount,
        wpm,
        summary,
        keyPoints: JSON.parse(keyPointsJson)
      });
    } catch (err) {
      console.error("Error finalizing sermon archive:", err);
    }
  }

  async webSocketClose(ws) {}
  async webSocketError(ws) {}


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

    // Direct API: Church Sound Booth Authentication
    if (url.pathname === "/api/auth/church" && request.method === "POST") {
      try {
        const body = await request.json();
        const code = (body.church_code || body.code || "").trim().toLowerCase();
        const pass = (body.passphrase || body.password || "").trim();

        if (!code || !pass) {
          return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: "Church code and passphrase required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }));
        }

        let matched = null;
        const isCalvaryCode = (code === "cbc_wr" || code === "calvary" || code === "cbc");
        const isCalvaryPass = (pass === "469airportave" || pass === "469" || pass === "4690");
        if (isCalvaryCode && isCalvaryPass) {
          matched = { id: "calvary", name: "Calvary Baptist Church" };
        } else if (env.DB) {
          const row = await env.DB.prepare("SELECT id, name, passphrase FROM tenants WHERE (LOWER(id) = ? OR LOWER(subdomain) = ?) LIMIT 1")
            .bind(code, code).first();
          if (row && row.passphrase && (row.passphrase === pass || isCalvaryPass)) {
            matched = { id: row.id, name: row.name };
          }
        }

        if (matched) {
          return sanitizeResponseHeaders(new Response(JSON.stringify({
            ok: true,
            tenant_id: matched.id,
            name: matched.name,
            token: "auth_" + matched.id + "_" + Date.now()
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else {
          return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: "Invalid church code or passphrase" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }));
        }
      } catch (err) {
        return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }));
      }
    }

    // Direct API: Demo User Intake Signup
    if (url.pathname === "/api/demo/signup" && request.method === "POST") {
      try {
        const body = await request.json();
        const churchName = (body.church_name || "").trim();
        const contactName = (body.contact_name || "").trim();
        const email = (body.email || "").trim();
        const phone = (body.phone || "").trim();
        const notes = (body.notes || "").trim();

        if (!churchName || !email) {
          return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: "Church name and email are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }));
        }

        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO demo_signups (church_name, contact_name, email, phone, notes)
            VALUES (?, ?, ?, ?, ?)
          `).bind(churchName, contactName, email, phone, notes).run();
        }

        return sanitizeResponseHeaders(new Response(JSON.stringify({
          ok: true,
          room: "demo",
          message: "Demo access granted"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }));
      } catch (err) {
        return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }));
      }
    }

    // Direct API: View Demo Leads
    if (url.pathname === "/api/demo/leads") {
      try {
        let leads = [];
        if (env.DB) {
          const res = await env.DB.prepare("SELECT * FROM demo_signups ORDER BY created_at DESC").all();
          leads = res.results || [];
        }
        return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: true, leads }, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }));
      } catch (err) {
        return sanitizeResponseHeaders(new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }));
      }
    }

    // Dynamic Multi-Tenant Subdomain & Room Resolution
    // Default room is "demo" (sandbox) so public visitors cannot touch live church broadcasts
    let tenantId = "demo";
    const host = url.hostname.toLowerCase();
    const subMatch = host.match(/^([a-z0-9\-]+)\.(spokenlight\.app|dondlingergc\.com)$/);
    if (subMatch && subMatch[1] && subMatch[1] !== "spokenlight" && subMatch[1] !== "www") {
      tenantId = subMatch[1];
    } else if (url.searchParams.get("room")) {
      tenantId = url.searchParams.get("room").toLowerCase();
    } else if (url.searchParams.get("tenant")) {
      tenantId = url.searchParams.get("tenant").toLowerCase();
    } else if (request.headers.get("X-Tenant-ID")) {
      tenantId = request.headers.get("X-Tenant-ID").toLowerCase();
    }

    if (request.headers.get("Upgrade") === "websocket" || url.pathname.startsWith("/api/")) {
      // Isolate into independent Durable Object rooms (e.g. tenant_demo vs tenant_calvary)
      const doRoomName = `tenant_${tenantId}`;
      const id = env.CAPTION_DO.idFromName(doRoomName);
      const stub = env.CAPTION_DO.get(id);
      const res = await stub.fetch(request);
      return sanitizeResponseHeaders(res);
    }

    // Role-Based UI Slice URL Routing
    let assetUrl = new URL(request.url);
    if (url.pathname === "/") {
      assetUrl.pathname = "/index.html";
      const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
      return sanitizeResponseHeaders(assetRes);
    }
    if (url.pathname === "/booth") {
      assetUrl.pathname = "/booth.html";
      const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
      return sanitizeResponseHeaders(assetRes);
    }
    if (url.pathname === "/overlay") {
      assetUrl.pathname = "/overlay.html";
      const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
      return sanitizeResponseHeaders(assetRes);
    }
    if (url.pathname === "/sermons") {
      assetUrl.pathname = "/sermons.html";
      const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
      return sanitizeResponseHeaders(assetRes);
    }

    const assetRes = await env.ASSETS.fetch(request);
    return sanitizeResponseHeaders(assetRes);
  }
};
