/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {
  calculateScanRegion,
  driverLicenseFields,
  enhancedPdf417Plugin,
  parseDLInfo
} from './enhancedPdf417Plugin.js';
import {mrzPlugin} from './mrzPlugin.js';
import {pdf417Plugin} from './pdf417Plugin.js';
import {qrCodePlugin} from './qrCodePlugin.js';

export {
  qrCodePlugin,
  pdf417Plugin,
  enhancedPdf417Plugin,
  mrzPlugin
};

export {
  driverLicenseFields,
  parseDLInfo,
  calculateScanRegion
};

/**
 * Create a plugin with the standard interface.
 *
 * @param {string} format - Format identifier.
 * @param {Function} scanFunction - Scan function:
 *  (source, options) => Promise<results>.
 *
 * @returns {object} Plugin object.
 */
export function createPlugin(format, scanFunction) {
  return {
    format,
    scan: scanFunction
  };
}
