/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {BarcodeDetector} from 'barcode-detector/ponyfill';

/**
 * QR Code scanning plugin using BarcodeDetector API.
 */
export const qrCodePlugin = {
  format: 'qr_code',

  /**
   * Scan source for QR codes.
   *
   * @param {HTMLImageElement|HTMLVideoElement|
   *  HTMLCanvasElement|ImageData} source - Source to scan.
   * @param {object} options - Plugin-specific options.
   * @param {AbortSignal} options.signal - Abort signal.
   *
   * @returns {Promise<object[]>} Array of detected QR codes.
   */
  async scan(source, options = {}) {
    const {signal} = options;

    // Check for abort
    signal?.throwIfAborted();

    try {
      // Create detector for QR codes only
      const detector = new BarcodeDetector({formats: ['qr_code']});

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
      throw new Error(`QR code detection failed: ${error.message}`);
    }
  }
};
