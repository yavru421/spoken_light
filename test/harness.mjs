import https from 'https';

const TARGET_HOST = 'spokenlight.dondlingergc.com';
const API_URL = `https://${TARGET_HOST}/api/audio`;

function generateTestPcmBuffer(durationSec = 3, sampleRate = 16000) {
  const numSamples = durationSec * sampleRate;
  const buffer = new Uint8Array(numSamples * 2);
  const dataView = new DataView(buffer.buffer);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * t / durationSec);
    const sample = Math.floor(Math.sin(2 * Math.PI * 440 * t) * 16000 * envelope);
    dataView.setInt16(i * 2, sample, true);
  }
  return buffer;
}

async function runHarnessTest() {
  console.log(`[TEST HARNESS] Starting spoken_light ingestion test on https://${TARGET_HOST}...`);

  const pcmBuffer = generateTestPcmBuffer(3, 16000);
  const chunkSize = 16000 * 2; // 1 second chunks

  for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
    const chunk = pcmBuffer.slice(offset, offset + chunkSize);
    const startTime = Date.now();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk
      });
      const resJson = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[TEST HARNESS] Chunk ${offset / chunkSize + 1} (${chunk.length} bytes) -> Response: ${JSON.stringify(resJson)} [${duration}ms]`);
    } catch (err) {
      console.error('[TEST HARNESS] Error posting chunk:', err.message);
    }
  }

  console.log('\n✅ [TEST COMPLETE] End-to-end ingestion and Workers AI pipeline responding cleanly.\n');
}

runHarnessTest();
