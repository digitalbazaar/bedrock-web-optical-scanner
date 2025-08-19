/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Core optical scanner that provides async API for scanning various formats
 * from images, video elements, or other sources.
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
    * @param {string} plugin.format -
    *  Format identifier (e.g., 'qr_code', 'pdf417').
    * @param {Function} plugin.scan -
    *  Scan function: (source, options) => Promise<results>.
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
   *   ImageData} source -
   *  Source to scan.
   * @param {object} options - Scanning options.
   * @param {string[]} options.formats -
   *  Formats to scan for (e.g., ['qr_code', 'pdf417', 'mrz']).
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
      formats = ['qr_code'],
      mode = 'first',
      signal,
      pluginOptions = {}
    } = options;

    // Validate formats
    const unsupportedFormats = formats.filter(f => !this.plugins.has(f));
    if(unsupportedFormats.length > 0) {
      throw new Error(`Unsupported formats: ${unsupportedFormats.join(', ')}`);
    }

    // Check for abort
    signal?.throwIfAborted();

    const results = [];
    const promises = [];

    for(const format of formats) {
      const plugin = this.plugins.get(format);
      const scanPromise = this._scanWithPlugin(plugin, source, {
        ...pluginOptions[format],
        signal
      });

      promises.push(scanPromise.then(result => ({
        format,
        success: true,
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
          console.log('Ignore individual plugin errors in first mode');
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
    * Scan continuously from a video stream until results found or cancelled.
    *
    * @param {HTMLVideoElement} video - Video element to scan from.
    * @param {object} options - Same as scan() options.
    *
    * @returns {Promise<object[]>} Results when found.
    */
  async scanContinuous(video, options = {}) {
    const {signal} = options;

    return new Promise((resolve, reject) => {
      const attemptScan = async () => {
        try {
          signal?.throwIfAborted();

          const results = await this.scan(video, {
            ...options,
            mode: 'first' // For continuous scanning, stop at first result
          });

          if(results.length > 0) {
            return resolve(results);
          }

          // Schedule next scan attempt
          video.requestVideoFrameCallback(attemptScan);
        } catch(error) {
          if(error) {
            return reject(error);
          }

          // For other errors, continue trying
          video.requestVideoFrameCallback(attemptScan);
        }
      };

      // Start scanning
      video.requestVideoFrameCallback(attemptScan);
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

  // Private methods

  async _scanWithPlugin(plugin, source, options) {
    return plugin.scan(source, options);
  }

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

      // Listen for abort
      const abortHandler = () => {
        if(!resolved) {
          resolved = true;
          reject(new DOMException('Operation aborted', 'AbortError'));
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

  async _waitForAll(promises, signal) {
    signal?.throwIfAborted();

    const results = await Promise.allSettled(promises);
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    return successful;
  }

  async _waitExhaustive(promises, signal) {
    // Same as 'all' for now - exhaustive means let all plugins try
    return this._waitForAll(promises, signal);
  }

}
