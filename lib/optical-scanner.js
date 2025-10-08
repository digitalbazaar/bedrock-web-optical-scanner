/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Core optical scanner that provides async API for scanning various formats
 * from images, video elements, or other sources. V3.
 */

export class OpticalScanner {
  constructor({plugins = []} = {}) {
    this.plugins = new Map();

    // Register provided plugins
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  /**
  * Register a scanning plugin for a specific format.
  *
  * @param {object} plugin - Plugin with format and scanner function.
  * @param {string} plugin.format - Format identifier
  *  (e.g., 'qr_code', 'pdf417').
  * @param {Function} plugin.scan - Scan function:
  *  (source, options) => Promise<results>.
  */
  registerPlugin(plugin) {
    if(!plugin.format || !plugin.scan) {
      throw new Error('Plugin must have format and scan properties');
    }
    this.plugins.set(plugin.format, plugin);
  }

  /**
  * Scan source for optical codes/data.
  *
  * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
  *  ImageData} source - Source to scan.
  * @param {object} options - Scanning options.
  * @param {string[]} options.formats -
  *  Formats to scan for (e.g.,
  *  ['qr_code', 'pdf417', 'pdf417_enhanced', 'mrz']).
  * @param {string} options.mode -
  *  Resolution mode: 'first' | 'all' | 'exhaustive'.
  * @param {AbortSignal} options.signal -
  *  Abort signal for cancellation.
  * @param {object} options.pluginOptions -
  *  Options passed to individual plugins.
  *
  * @returns {Promise<object[]>} Array of scan results with format and data.
  */
  async scan(source, options = {}) {
    const {
      formats = ['qr_code', 'pdf417', 'pdf417_enhanced', 'mrz'],
      mode = 'first',
      signal,
      pluginOptions = {},
      timeoutMs = 0
    } = options;

    // Create timeout-aware signal
    const controller = this._createTimeoutController(signal, timeoutMs);
    const effectiveSignal = controller?.signal || signal;

    // Validate formats
    const unsupportedFormats = formats.filter(f => !this.plugins.has(f));
    if(unsupportedFormats.length > 0) {
      throw new Error(`Unsupported formats: ${unsupportedFormats.join(', ')}`);
    }

    // Check for abort
    effectiveSignal?.throwIfAborted();

    const results = [];
    const promises = [];

    for(const format of formats) {
      const plugin = this.plugins.get(format);

      // Debug Logs
      console.log('=== OPTICAL SCANNER LAYER - PLUGIN OPTIONS EXTRACTION ===');
      console.log('Format:', format);
      console.log('pluginOptions object:', pluginOptions);
      console.log('About to pass to plugin:',
        {...pluginOptions[format], signal});
      console.log('==========================================================');

      const scanPromise = this._scanWithPlugin(plugin, source, {
        ...pluginOptions[format],
        signal: effectiveSignal
      });

      promises.push(scanPromise.then(result => ({
        format,
        success: result && result.length > 0, // Only success if has data
        data: result
      })).catch(error => ({
        format,
        success: false,
        error: error.message
      })));

      // For 'first' mode, resolve as soon as any plugin succeeds
      if(mode === 'first') {
        scanPromise.then(result => {
          if(result) {
            results.push({format, data: result});
          }
        }).catch(() => {
          // Ignore individual plugin errors in 'first' mode
          console.log('=== OPTICAL SCANNER LAYER ===');
          console.log('Ignore individual plugin errors in first mode');
        });
      }
    }

    // Handle different resolution mode
    switch(mode) {
      case 'first':
        return this._waitForFirst(promises, effectiveSignal);
      case 'all':
        return this._waitForAll(promises, effectiveSignal);
      case 'exhaustive':
        return this._waitExhaustive(promises, effectiveSignal);
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  /**
  * Scan continuously from a video stream until results found or cancelled.
  *
  * This method automatically selects the optimal scanning strategy based on
  * the source type:
  * - HTMLVideoElement: Uses requestVideoFrameCallback (30-60 fps).
  * - Other sources: Uses polling fallback (0.4 fps).
  *
  * PERFORMANCE NOTE:
  * For best performance, always pass HTMLVideoElement when scanning video.
  * Other source types will work but with significantly reduced performance.
  *
  * @param {HTMLVideoElement|*} video - Video element to scan from
  *  (or other source).
  * @param {object} options - Scanning options.
  * @param {string[]} options.formats - Formats to scan for.
  * @param {string} options.mode - Resolution mode (typically 'first').
  * @param {object} options.pluginOptions - Plugin-specific options.
  * @param {AbortSignal} options.signal - Abort signal for cancellation.
  * @param {number} options.timeoutMs - Timeout in milliseconds.
  *
  * @returns {Promise<object[]>} Array of scan results when found.
  *
  * @throws {Error} If scan is aborted, times out, or is cancelled.
  */
  async scanContinuous(video, options = {}) {
    // Route to optimal implementation based on source type.
    if(video instanceof HTMLVideoElement) {
      // Fast path: Frame-accurate scanning for video elements.
      return this._scanContinuousFrameCallback(video, options);
    }

    // Fallback: Polling-based scanning for compatibility.
    console.warn(
      'OpticalScanner.scanContinuous: Non-video source detected. ' +
      'Using polling fallback. For best performance, use HTMLVideoElement.'
    );
    return this._scanContinuousPolling(video, options);
  }

  /**
  * DO NOT USE scanContinuous_BACKUP().
  * Flagged Backup as of Date: Oct 08, 2025.
  * Reason: Before implementing frame-accurate scanning optimization
  * This code preserves the polling-based implementation before
  * refactoring to use requestVideoFrameCallback for performance.
  *
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

  * Scan continuously from a video stream until results found or cancelled.
  *
  * @param {HTMLVideoElement} video - Video element to scan from.
  * @param {object} options - Same as scan() options.
  *
  * @returns {Promise<object[]>} Results when found.
  */
  async scanContinuous_BACKUP(video, options = {}) {
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

  /**
  * Scan continuously using requestVideoFrameCallback for optimal performance.
  *
  * This method provides frame-accurate scanning by checking every video frame
  * for barcodes. It's significantly faster than polling (30-60 fps vs 0.4 fps).
  *
  * ARCHITECTURE NOTE:
  * - Uses requestVideoFrameCallback() for synchronization with video frames.
  * - Resolves as soon as any format is detected (mode: 'first').
  * - Handles timeout and abort signals properly.
  * - Retries on errors (except AbortError).
  *
  * PERFORMANCE:
  * - Scans at video frame rate (typically 30-60 fps).
  * - Near-instant detection compared to polling approach.
  * - No artificial delays between scan attempts.
  *
  * @private
  * @param {HTMLVideoElement} video - Video element to scan from.
  * @param {object} options - Scanning options.
  * @param {string[]} options.formats - Formats to scan for.
  * @param {string} options.mode - Resolution mode (typically 'first').
  * @param {object} options.pluginOptions - Plugin-specific options.
  * @param {AbortSignal} options.signal - Abort signal for cancellation.
  * @param {number} options.timeoutMs - Timeout in milliseconds.
  *
  * @returns {Promise<object[]>} Array of scan results when found.
  *
  * @throws {Error} If scan is aborted or times out.
  */
  async _scanContinuousFrameCallback(video, options) {
    const {signal, timeoutMs = 0, formats, mode, pluginOptions} = options;

    // Create timeout-aware abort signal.
    const controller = this._createTimeoutController(signal, timeoutMs);
    const effectiveSignal = controller?.signal || signal;

    return new Promise((resolve, reject) => {
      let frameCount = 0;

      const scanFrame = async () => {
        try {
          // Check for abort (timeout or user cancellation).
          effectiveSignal?.throwIfAborted();

          frameCount++;

          // Scan current video frame.
          const results = await this.scan(video, {
            formats,
            mode,
            pluginOptions,
            signal: effectiveSignal,
            // Don't timeout individual scans (handled at this level).
            timeoutMs: 0
          });

          // Success - found results.
          if(results?.length > 0) {
            console.log(
              `Frame-accurate scan: barcode detected after ${frameCount} frames`
            );
            return resolve(results);
          }

          // No results yet - schedule next frame.
          video.requestVideoFrameCallback(scanFrame);

        } catch(error) {
          // Handle abort/timeout.
          if(error.name === 'AbortError' || effectiveSignal?.aborted) {
            console.log(
              `Frame-accurate scan: aborted after ${frameCount} frames`
            );
            return reject(error);
          }

          // Other errors - log and retry next frame.
          console.warn(
            'Frame-accurate scan: error on frame scan (retrying):',
            error.message
          );
          video.requestVideoFrameCallback(scanFrame);
        }
      };

      // Start scanning on next available frame.
      video.requestVideoFrameCallback(scanFrame);
    });
  }

  /**
  * Scan continuously using polling approach (fallback for non-video sources).
  *
  * This method uses setTimeout with delays between scan attempts. It's less
  * efficient than frame callbacks but works with any source type.
  *
  * ARCHITECTURE NOTE:
  * - Uses setTimeout() with 2.5 second delays between attempts.
  * - Works as fallback when requestVideoFrameCallback is not available.
  * - Provides compatibility with non-HTMLVideoElement sources.
  *
  * PERFORMANCE:
  * - Scans at ~0.4 fps (every 2.5 seconds).
  * - Slower than frame-callback approach but universally compatible.
  * - Artificial delays may cause user to wait longer for detection.
  *
  * @private
  * @param {*} source - Source to scan (any supported type).
  * @param {object} options - Scanning options.
  * @param {string[]} options.formats - Formats to scan for.
  * @param {string} options.mode - Resolution mode (typically 'first').
  * @param {object} options.pluginOptions - Plugin-specific options.
  * @param {AbortSignal} options.signal - Abort signal for cancellation.
  * @param {number} options.timeoutMs - Timeout in milliseconds.
  *
  * @returns {Promise<object[]>} Array of scan results when found.
  *
  * @throws {Error} If scan is aborted, times out, or is cancelled.
  */
  async _scanContinuousPolling(source, options) {
    const {signal, timeoutMs = 0, formats, mode, pluginOptions} = options;

    // Create timeout-aware abort signal.
    const controller = this._createTimeoutController(signal, timeoutMs);
    const effectiveSignal = controller?.signal || signal;

    let attempt = 0;

    while(!effectiveSignal?.aborted) {
      attempt++;
      console.log(`Polling scan: attempt #${attempt} (2.5s interval)`);

      try {
        effectiveSignal?.throwIfAborted();

        const results = await this.scan(source, {
          formats,
          mode,
          pluginOptions,
          signal: effectiveSignal,
          // Don't timeout individual scans (handled at this level).
          timeoutMs: 0
        });

        if(results?.length > 0) {
          console.log(`Polling scan: results found after ${attempt} attempts`);
          return results;
        }

        // No results - wait before next attempt.
        console.log('Polling scan: no results, waiting 2.5s before retry.');
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch(error) {
        // Handle abort/timeout.
        if(error.name === 'AbortError' || effectiveSignal?.aborted) {
          throw error;
        }

        // Other errors - log and retry after delay.
        console.warn('Polling scan: error occurred (retrying in 2.5s):',
          error.message);
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    throw new Error('Continuous scanning was cancelled.');
  }

  // TODO: Tested scanAny function in isolation mode it works fine
  // Need to test thoroughly with the vue components and CameraScanner class.

  /**
  * Scan for any recognizable format (convenience method).
  *
  * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
  *  ImageData} source - Source to scan.
  * @param {object} options - Scanning options.
  *
  * @returns {Promise<object[]>} Array of scan results with format and data.
  */
  async scanAny(source, options = {}) {
    const {
      timeoutMs = 0, // Extract timeout from options
      ...restOptions
    } = options;
    return this.scan(source, {
      ...restOptions,
      formats: this.getSupportedFormats(),
      mode: 'first', // Try formats until one succeeds with data
      timeoutMs
    });
  }

  /**
  * Get list of supported formats.
  *
  * @returns {string[]} Array of supported format identifiers.
  */
  getSupportedFormats() {
    return Array.from(this.plugins.keys());
  }

  // === Private methods ===

  /**
  * Scans the provided source using the specified plugin.
  *
  * @async
  * @param {object} plugin - The plugin object that provides a `scan` method.
  * @param {*} source - The source data to be scanned by the plugin.
  * @param {object} options - Options to configure the scanning process.
  * @returns {Promise<*>} The result of the plugin's scan operation.
  */
  async _scanWithPlugin(plugin, source, options) {
    return plugin.scan(source, options);
  }

  /**
  * Waits for the first promise in the array to resolve with a successful
  * result.
  * If none of the promises resolve successfully, rejects with an error.
  * Also listens for an abort signal to cancel the operation.
  *
  * @param {Promise[]} promises - An array of promises to race.
  * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the
  *  operation.
  * @returns {Promise<Array>} Resolves with an array containing the
  *  first successful result.
  * @throws {Error|DOMException} If all promises fail or the operation
  *  is aborted.
  * @private
  */
  async _waitForFirst(promises, signal) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let completed = 0;
      const total = promises.length;

      const checkCompletion = () => {
        if(++completed === total && !resolved) {
          reject(new Error('No results found from any plugin'));
        }
      };

      // Listen for abort (including timeout)
      const abortHandler = () => {
        if(!resolved) {
          resolved = true;
          // Use the actual abort reason (could be timeout error
          // or user cancellation)
          const reason = signal.reason ||
            new DOMException('Operation aborted', 'AbortError');
          reject(reason);
        }
      };
      signal?.addEventListener('abort', abortHandler);

      promises.forEach(promise => {
        promise.then(result => {
          if(result.success && !resolved) {
            resolved = true;
            signal?.removeEventListener('abort', abortHandler);
            resolve([result]);
          } else {
            checkCompletion();
          }
        }).catch(() => {
          checkCompletion();
        });
      });
    });
  }

  // TODO: _waitForAll function - Need more testing

  /**
  * Waits for all provided promises to settle and returns only the
  * successful results.
  * Checks for an abort signal before and after waiting, and throws if aborted.
  *
  * @param {Promise[]} promises - An array of promises to wait for.
  * @param {AbortSignal} [signal] - Optional abort signal to cancel the
  *  operation.
  * @returns {Promise<object[]>} Resolves with an array of successful
  *  results (where `success` is true).
  * @throws {any} Throws if the operation is aborted or if another error
  *  occurs.
  */
  async _waitForAll(promises, signal) {
    signal?.throwIfAborted(); // Immediate exit if aborted

    try {
      const results = await Promise.allSettled(promises);
      // Check if aborted during Promise.allSettled
      signal?.throwIfAborted();
      const successful = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);

      return successful;
    } catch(error) {
      // Re-throw timeout errors properly
      if(signal?.aborted && signal.reason) {
        throw signal.reason;
      }
      throw error;
    }
  }

  // FIXME: _waitExhaustive() method currently behaves the
  // same as `_waitForAll()`.

  /**
  * Waits for all provided promises to settle, allowing all plugins to attempt
  * execution.
  *
  * @param {Promise[]} promises - An array of promises to wait for.
  * @param {AbortSignal} signal - An optional signal to abort the waiting
  *  process.
  * @returns {Promise<any[]>} A promise that resolves when all input
  *  promises have settled.
  */
  async _waitExhaustive(promises, signal) {
    // Same as 'all' for now - exhaustive means let all plugins try
    return this._waitForAll(promises, signal);
  }

  /**
  * Create timeout-aware AbortController that combines existing
  * signal with timeout.
  *
  * @private
  * @param {AbortSignal} existingSignal - Existing abort signal (optional).
  * @param {number} timeoutMs - Timeout in milliseconds (0 = no timeout).
  * @returns {AbortController|null} - Combined controller or null if
  *  no timeout/signal needed.
  */
  _createTimeoutController(existingSignal, timeoutMs) {
    console.log('Creating timeout controller:',
      {timeoutMs, hasExistingSignal: !!existingSignal});

    // If no timeout and no existing signal, return null
    if(timeoutMs <= 0 && !existingSignal) {
      console.log('No timeout needed, returning null');
      return null;
    }

    // Create new controller to combine timeout + existing signal
    const controller = new AbortController();
    let timeoutId = null;

    // Handle existing signal
    if(existingSignal) {
    // If already aborted, abort immediately
      if(existingSignal.aborted) {
        controller.abort(existingSignal.reason);
        return controller;
      }

      // Listen for existing signal abortion
      existingSignal.addEventListener('abort', () => {
        if(timeoutId) {
          clearTimeout(timeoutId);
        }
        controller.abort(existingSignal.reason);
      }, {once: true});
    }

    // Set timeout if specified
    if(timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if(!controller.signal.aborted) {
          const timeoutError = new Error('SCAN_TIMEOUT');
          timeoutError.code = 'SCAN_TIMEOUT';
          controller.abort(timeoutError);
        }
      }, timeoutMs);
    }

    return controller;
  }
}
