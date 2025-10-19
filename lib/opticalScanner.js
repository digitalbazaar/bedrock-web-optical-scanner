/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Core optical scanner that provides async API for scanning various formats
 * from images, video elements, or other sources. V3.
 */
import {createLogger, isDebugEnabled} from './utils/logger.js';
const logger = createLogger('[OpticalScanner]');

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
      signal: userSignal,
      pluginOptions = {},
      timeoutMs = 0
    } = options;

    // Combine user signal + timeout into one signal
    const signal = this._combineSignals(userSignal, timeoutMs) || userSignal;

    // Validate formats
    const unsupportedFormats =
      formats.filter(format => !this.plugins.has(format));
    if(unsupportedFormats.length > 0) {
      throw new Error(`Unsupported formats: ${unsupportedFormats.join(', ')}`);
    }

    // Check for abort
    signal?.throwIfAborted();

    const results = [];
    const promises = [];

    for(const format of formats) {
      const plugin = this.plugins.get(format);

      // Debug Logs
      // isDebugEnabled() && console.log('Format:', format);
      // isDebugEnabled() &&
      //   console.log('pluginOptions object:', pluginOptions);
      // isDebugEnabled() && console.log('About to pass to plugin:',
      //   {...pluginOptions[format], signal});
      // isDebugEnabled() &&
      //  console.log('======================================================');

      const scanPromise = this._scanWithPlugin(plugin, source, {
        ...pluginOptions[format],
        signal
      });

      promises.push(scanPromise.then(result => ({
        format,
        // Only success if has data
        success: result && result.length > 0,
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
          if(isDebugEnabled()) {
            console.log(
              ...logger.prefix('Ignore individual plugin errors in first mode')
            );
          }
        });
      }
    }

    // Handle different resolution mode
    switch(mode) {
      case 'first':
        return this._waitForFirst(promises, signal);
      case 'all':
        return this._waitForAll(promises, signal);
      case 'exhaustive':
        return this._waitExhaustive(promises, signal);
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  /**
  * ==========================================================================
  * CONTINUOUS SCANNING ARCHITECTURE.
  * ==========================================================================
  *
  * Two strategies: video elements use frame callbacks (fast), other sources
  * use polling (compatible). Routes automatically based on source type.
  *
  * Performance varies by device. See README for details.
  *
  * HISTORICAL CONTEXT:
  * This refactor restores the frame-accurate performance that was lost
  * during the architectural split of scanning logic from Vue components.
  * Original implementation: bedrock-vue-barcode-scanner/lib/barcodes.js
  *
  * ==========================================================================
  */

  /**
  * Scan continuously from a video stream until results found or cancelled.
  *
  * This method automatically selects the optimal scanning strategy based on
  * the source type:
  * - HTMLVideoElement: Uses requestVideoFrameCallback (12-16 fps).
  * - Other sources: Uses polling fallback (0.4 fps).
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
    const sourceType = video?.constructor?.name || 'unknown';
    // Fallback: Polling-based scanning for compatibility.
    console.warn(
      'OpticalScanner.scanContinuous: Non-optimal source type detected.\n' +
      `  Source type: ${sourceType}\n` +
      '  Strategy: Polling fallback (2.5s intervals, ~0.4 fps)\n' +
      '  Recommendation: Use HTMLVideoElement for 30x-40x better performance ' +
      '(12-16 fps)'
    );
    console.warn('Polling fallback: Source is not video element, using' +
      'setTimeout() approach');
    return this._scanContinuousPolling(video, options);
  }

  /**
  *
  * This method provides frame-accurate scanning by processing video frames
  * for barcodes. It's significantly faster than polling (12-16 fps vs 0.4 fps).
  *
  * PERFORMANCE:
  * - Scan rate: 12-16 fps (approx one scan every 62-83 ms).
  * - Video runs at 60 fps, but scans are limited by processing/detection
  *   time (~50-80ms per scan) plus overhead.
  * - No artificial delays - scans as fast as processing allows.
  *
  * Note: Scan rate is lower than video frame rate due to barcode/mrz detection
  * processing time. This is expected and normal behavior.
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
    const {
      signal: userSignal,
      timeoutMs = 0,
      formats,
      mode,
      pluginOptions
    } = options;

    isDebugEnabled() && console.log(...logger.prefix('Video properties:', {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      muted: video.muted
    }));

    // Combine user signal + timeout into one signal
    const signal = this._combineSignals(userSignal, timeoutMs) || userSignal;

    // Metrics tracker
    const metrics = this._createScanMetrics();

    // Delegate to frame loop
    return this._runFrameLoop(
      video, {formats, mode, pluginOptions, signal}, metrics
    );
  }

  /**
  * Polling-based scanning with setTimeout delays.
  * Fallback for non-video sources (scans every 2.5 seconds).
  *
  * This method uses setTimeout with delays between scan attempts. It's less
  * efficient than frame callbacks but works with any source type.
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
    const {
      signal: userSignal,
      timeoutMs = 0,
      formats,
      mode,
      pluginOptions
    } = options;

    // Combine user signal + timeout into one signal
    const signal = this._combineSignals(userSignal, timeoutMs) || userSignal;

    let attempt = 0;

    while(!signal?.aborted) {
      attempt++;
      isDebugEnabled() &&
        console.log(
          ...logger.prefix(`Polling scan: attempt #${attempt} (2.5s interval)`)
        );

      try {
        signal?.throwIfAborted();

        const results = await this.scan(source, {
          formats,
          mode,
          pluginOptions,
          signal,
          // Don't timeout individual scans (handled at this level).
          timeoutMs: 0
        });

        if(results?.length > 0) {
          isDebugEnabled() &&
            console.log(...logger.prefix(
              `Polling scan: results found after ${attempt} attempts`)
            );
          return results;
        }

        // No results - wait before next attempt.
        isDebugEnabled() &&
          console.log(...logger.prefix(
            'Polling scan: no results, waiting 2.5s before retry.'
          ));
        await new Promise(resolve => setTimeout(resolve, 2500));

      } catch(error) {
        // Handle abort/timeout.
        if(error.name === 'AbortError' || signal?.aborted) {
          // const reason = error.code === 'SCAN_TIMEOUT' ?
          //   'timeout' : 'user cancellation';
          const reason = this._isTimeoutError(error, signal) ?
            'timeout' : 'user cancellation';

          // Use helper with reason context.
          const enhancedError = this._createScanError(error, {
            customMessage: 'Continuous polling scan aborted',
            attemptCount: attempt,
            reason,
            scanMethod: 'polling'
          });
          throw enhancedError;
        }

        // Other errors - log and retry after delay.
        console.warn(`Polling scan: error on attempt ${attempt} ` +
          `(retrying in 2.5s): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    // Use helper to create consistent cancellation error.
    const cancelError = this._createScanError(
      new Error('Continuous polling scan was cancelled.'),
      {
        attemptCount: attempt,
        scanMethod: 'polling'
      }
    );
    cancelError.code = 'SCAN_CANCELLED';
    throw cancelError;
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
      // Extract timeout from options
      timeoutMs = 0,
      ...restOptions
    } = options;
    return this.scan(source, {
      ...restOptions,
      formats: this.getSupportedFormats(),
      // Try formats until one succeeds with data
      mode: 'first',
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
  * Core frame loop using requestVideoFrameCallback.
  * Separates frame scheduling from scan logic for maintainability.
  *
  * @private
  * @param {HTMLVideoElement} video - Video element to scan.
  * @param {object} scanOptions - Options for scanning.
  * @param {string[]} scanOptions.formats - Formats to scan for.
  * @param {string} scanOptions.mode - Resolution mode.
  * @param {object} scanOptions.pluginOptions - Plugin-specific options.
  * @param {AbortSignal} scanOptions.signal - Abort signal.
  * @param {object} metrics - Metrics tracker object.
  *
  * @returns {Promise<object[]>} Array of scan results when found.
  * @throws {Error} If scan is aborted or times out.
  */
  _runFrameLoop(video, scanOptions, metrics) {
    return new Promise((resolve, reject) => {

      const processFrame = async () => {
        const scanStartTime = Date.now();

        try {
          const {signal, formats, mode, pluginOptions} = scanOptions;

          // Check for abort
          signal?.throwIfAborted();

          // Update metrics
          this._updateScanMetrics(metrics);

          // Scan current frame
          const results = await this.scan(video, {
            formats,
            mode,
            pluginOptions,
            signal,
            // Don't timeout individual scans (handled at this level).
            timeoutMs: 0
          });

          const scanDuration = Date.now() - scanStartTime;
          isDebugEnabled() && console.log(
            ...logger.prefix(`Scan took ${scanDuration}ms`)
          );

          // Success - found results
          if(results?.length > 0) {
            this._logScanSuccess(metrics);
            return resolve(results);
          }

          // No results - schedule next frame
          scheduleNextFrame();

        } catch(error) {
          // Handle abort/timeout
          if(this._isAbortError(error, scanOptions.signal)) {
            const reason = this._isTimeoutError(error, scanOptions.signal) ?
              'timeout' : 'user cancellation';

            isDebugEnabled() && console.log(...logger.prefix(
              `Frame scan stopped due to ${reason}` +
              ` after ${metrics.frameCount} frames`
            ));

            const enhancedError = this._createScanError(error, {
              customMessage: 'Continuous scan aborted',
              frameCount: metrics.frameCount,
              reason,
              scanMethod: 'frame-callback'
            });
            return reject(enhancedError);
          }

          // Other errors - log and retry
          if(!error.message.includes('No results found')) {
            console.warn('Frame scan error (retrying):', error.message);
          }
          scheduleNextFrame();
        }
      };

      // Single scheduling function
      // only place requestVideoFrameCallback is called
      function scheduleNextFrame() {
        video.requestVideoFrameCallback(processFrame);
      }

      // Start the loop
      scheduleNextFrame();
    });
  }

  /**
  * Create metrics tracker for scan performance.
  *
  * @private
  * @returns {object} Metrics tracker object.
  */
  _createScanMetrics() {
    return {
      frameCount: 0,
      startTime: Date.now(),
      lastFrameTime: Date.now(),
      frameDelta: 0
    };
  }

  /**
  * Update scan metrics for current frame.
  * Measures:
  * - frameDelta: Milliseconds since last scan completed (e.g., 75ms).
  * - currentFps: Instantaneous scan rate (e.g., 1000/75 = 13.3 fps).
  *
  * Note: This measures actual SCAN rate (12-16 fps), not video frame
  * rate (60 fps). Scan rate is lower because each scan takes ~50-80ms
  * to process.
  *
  * @private
  * @param {object} metrics - Metrics tracker object.
  */
  _updateScanMetrics(metrics) {
    const now = Date.now();
    // Time since last scan
    metrics.frameDelta = now - metrics.lastFrameTime;
    metrics.lastFrameTime = now;
    metrics.frameCount++;

    // Log every 30 frames to avoid console spam
    if(metrics.frameCount % 30 === 0) {
      const currentFps = Math.round(1000 / metrics.frameDelta);
      isDebugEnabled() && console.log(...logger.prefix(
        `Frame ${metrics.frameCount}:` +
        ` ${metrics.frameDelta}ms delta (~${currentFps} fps)`
      ));
    }
  }

  /**
  * Log successful scan completion with performance metrics.
  *
  * Calculates average scan rate over the entire scanning session.
  * Example: If 50 scans took 3000ms, average fps = (50/3000)*1000 = 16.7 fps.
  *
  * This is the AVERAGE scan rate, which may differ from instantaneous rate
  * due to variations in processing time per frame.
  *
  * @private
  * @param {object} metrics - Metrics tracker object.
  */
  _logScanSuccess(metrics) {
    if(!isDebugEnabled()) {
      return;
    }

    const scanDuration = Date.now() - metrics.startTime;
    const fps = Math.round((metrics.frameCount / scanDuration) * 1000);

    console.log(...logger.prefix(
      `Scan complete: ${metrics.frameCount} frames,` +
      ` ${scanDuration}ms, ~${fps} fps`
    ));
  }

  /**
  * Check if error is an abort error.
  *
  * @private
  * @param {Error} error - Error to check.
  * @param {AbortSignal} signal - Signal that was used.
  * @returns {boolean} True if error is from abort.
  */
  _isAbortError(error, signal) {
    return error.name === 'AbortError' || signal?.aborted;
  }

  /**
  * Check if error is from timeout signal.
  *
  * @private
  * @param {Error} error - Error to check.
  * @param {AbortSignal} signal - Signal that was used.
  * @returns {boolean} True if error is from timeout.
  */
  _isTimeoutError(error, signal) {
    return (
      error.name === 'TimeoutError' ||
      (error.name === 'AbortError' && signal?.reason?.name === 'TimeoutError')
    );
  }

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
    // Immediate exit if aborted
    signal?.throwIfAborted();

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
  * Combine user signal and timeout into a single signal.
  * Uses browser-standard AbortSignal.any() and AbortSignal.timeout().
  *
  * @private
  * @param {AbortSignal} [userSignal] - User-provided abort signal (optional).
  * @param {number} timeoutMs - Timeout in milliseconds (0 = no timeout).
  * @returns {AbortSignal|undefined} Combined signal or undefined if
  *  neither provided.
  */
  _combineSignals(userSignal, timeoutMs) {
    // No signal or timeout needed
    if(!userSignal && timeoutMs <= 0) {
      return undefined;
    }

    // Collect signals to combine
    const signals = [];
    if(userSignal) {
      signals.push(userSignal);
    }

    if(timeoutMs > 0) {
      signals.push(AbortSignal.timeout(timeoutMs));
    }

    const combinedResults =
      signals.length === 1 ? signals[0] : AbortSignal.any(signals);

    // Return combined signal (or single signal if only one)
    return combinedResults;
  }

  /**
  * Create enhanced error with scan context for better debugging.
  *
  * @private
  * @param {Error} originalError - Original error object.
  * @param {object} context - Additional context information.
  * @param {number} context.frameCount - Number of frames scanned.
  * @param {number} context.attemptCount - Number of attempts made.
  * @param {string} context.scanMethod - Which scan method was used.
  * @param {string} context.reason - Reason for error (e.g., 'timeout').
  * @param {string} context.customMessage - Override message entirely.
  *
  * @returns {Error} Enhanced error with context.
  */
  _createScanError(originalError, context = {}) {
    const {
      frameCount,
      attemptCount,
      scanMethod = 'unknown',
      reason,
      customMessage
    } = context;

    // Use custom message if provided, otherwise use original.
    let message = customMessage || originalError.message;

    // Add context to message.
    if(frameCount !== undefined) {
      message += ` after ${frameCount} frames`;
    }
    if(attemptCount !== undefined) {
      message += ` after ${attemptCount} attempts`;
    }
    if(reason) {
      message += ` (${reason})`;
    }

    const enhancedError = new Error(message);
    enhancedError.code = originalError.code || 'SCAN_ERROR';
    enhancedError.scanMethod = scanMethod;
    enhancedError.frameCount = frameCount;
    enhancedError.attemptCount = attemptCount;
    enhancedError.reason = reason;
    enhancedError.originalError = originalError;

    return enhancedError;
  }
}
