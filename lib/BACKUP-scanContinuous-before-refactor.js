/*!
 * BACKUP - Original scanContinuous Implementation Code from optical-scanner.js
 * Created: Oct 08, 2025
 * Reason: Before implementing frame-accurate scanning optimization
 *
 * This file preserves the polling-based implementation before
 * refactoring to use requestVideoFrameCallback for performance.
 *
 * NOTE: This backup implementation is intentionally defined as a standalone
 * async function instead of a class method.
 */

/**
 * Original scanContinuous method - Polling-based approach.
 *
 * ISSUES WITH THIS IMPLEMENTATION:
 * - Uses setTimeout with 2.5s delays.
 * - Scans at ~0.4 fps (every 2.5 seconds).
 * - 150x slower than frame-accurate approach.
 * - Poor user experience (must hold barcode steady for 2.5+ seconds).
 *
 * CALLED BY:
 * - CameraScanner.scan() when useContinuous === true.
 * - Only for scanType === 'barcode' with video element.
 *
 * @param {HTMLVideoElement} video - Video element to scan from.
 * @param {object} options - Same as scan() options.
 *
 * @returns {Promise<object[]>} Results when found.
 */
async function scanContinuous_ORIGINAL_POLLING(video, options = {}) {
  const {signal, timeoutMs = 0} = options;

  // Debug Logs
  console.log('=== OPTICAL SCANNER LAYER - CONTINUOUS SCANNING ===');
  console.log('timeoutMs:', timeoutMs);
  console.log('signal provided:', !!signal);
  console.log('signal aborted:', signal?.aborted);
  console.log('===================================================');

  // Create timeout-aware signal for continuous scanning
  const controller = this._createTimeoutController(signal, timeoutMs);
  const effectiveSignal = controller?.signal || signal;

  // Debug Logs
  // console.log('effectiveSignal created:', !!effectiveSignal);
  // console.log('effectiveSignal aborted:', effectiveSignal?.aborted);

  let attempt = 0;

  while(!effectiveSignal?.aborted) {
    attempt++;
    console.log('=== OPTICAL SCANNER LAYER - CONTINUOUS SCANNING ===');
    console.log(`CONTINUOUS SCAN ATTEMPT: #${attempt}`);
    console.log('===================================================');

    try {
      effectiveSignal?.throwIfAborted();
      const results = await this.scan(video, {
        ...options,
        signal: effectiveSignal,
        // Disable timeout in individual scan (handled at this level)
        timeoutMs: 0,
        mode: 'first' // For continuous scanning, stop at first result
      });

      if(results && results.length > 0) {
        console.log(`Continuous scan found results in attempt #${attempt}!`,
          results);
        return results; // Success - return immediately
      }

      // console.log('No results, scheduling next attempt...');
      // No results - wait before next attempt
      console.log('No results found, waiting 2.5s before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 2500));

    } catch(error) {
      if(error.name === 'AbortError') {
        throw error; // User cancelled - exit loop
      }
      // Other errors - log and retry after delay
      console.log('Scan attempt failed, retrying in 2.5s...', error.message);
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  throw new Error('Continuous scanning was cancelled.');
}
