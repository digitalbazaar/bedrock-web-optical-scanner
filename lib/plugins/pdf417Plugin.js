/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {BarcodeDetector} from 'barcode-detector/ponyfill';

/**
* PDF417 scanning plugin using BarcodeDetector API.
*/
export const pdf417Plugin = {
  format: 'pdf417',

  /**
  * Scan source for PDF417 codes.
  *
  * @param {HTMLImageElement|HTMLVideoElement|
  *  HTMLCanvasElement|ImageData} source - Source to scan.
  * @param {object} options - Plugin-specific options.
  * @param {AbortSignal} options.signal - Abort signal.
  *
  * @returns {Promise<object[]>} Array of detected PDF417 codes.
  */
  async scan(source, options = {}) {
    const {signal} = options;

    // Check for abort
    signal?.throwIfAborted();

    try {
      // Create detector for PDF417 codes only
      const detector = new BarcodeDetector({formats: ['pdf417']});

      // Detect barcodes
      const barcodes = await detector.detect(source);

      // Check for abort after detection
      signal?.throwIfAborted();

      // Transform results to standard format
      return barcodes.map(barcode => ({
        text: barcode.rawValue,
        format: barcode.format,
        boundingBox: barcode.boundingBox,
        cornerPoints: barcode.cornerPoints
      }));

    } catch(error) {
      if(error.name === 'AbortError') {
        throw error;
      }

      // Wrap other errors with more context
      throw new Error(`PDF417 detection failed: ${error.message}`);
    }
  }
};
