# Spoken Light (`spokenlight.dondlingergc.com`)

Zero-footprint, cloud-hosted live captioning pipeline running on Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`) and Cloudflare Durable Objects.

## Features
- **Mobile Audio Streamer & Admin Controller**: Live browser microphone PCM audio ingestion with initial prompt context memory tuning.
- **Durable Object Buffer**: Real-time sliding window audio overlap buffer for continuous streaming inference.
- **OBS Lower-Third Overlay**: Transparent WebSockets-driven lower-third caption overlay (`/overlay.html`).
- **Custom Edge Domain**: Configured and deployed on `spokenlight.dondlingergc.com`.

## Project Structure
- `src/audio-do.js` - Worker request router and `CaptionDurableObject` state machine.
- `public/admin.html` - Authenticated Admin & Audio Streaming Dispatch Panel.
- `public/overlay.html` - OBS Lower-Third WebSockets Caption Overlay.
- `wrangler.toml` - Cloudflare Workers, Durable Objects, and Custom Domain route configuration.
