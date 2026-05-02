// Simulates SSE streaming with realistic typing delays for demo/recording mode.

/**
 * Stream a long string character-by-character (grouped in small chunks).
 * Calls onChunk(text) repeatedly, then resolves.
 */
export function streamText(text, onChunk, { chunkSize = 6, delayMs = 18 } = {}) {
  return new Promise((resolve) => {
    let i = 0;
    function tick() {
      if (i >= text.length) { resolve(); return; }
      const end = Math.min(i + chunkSize, text.length);
      onChunk(text.slice(i, end));
      i = end;
      setTimeout(tick, delayMs);
    }
    tick();
  });
}

/** Simple delay helper */
export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}