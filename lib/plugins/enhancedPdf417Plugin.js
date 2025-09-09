/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {BarcodeReader, EnumBarcodeFormat} from 'dynamsoft-javascript-barcode';
import {BarcodeDetector} from 'barcode-detector/ponyfill';

/**
 * Driver License field mappings for PDF417 data parsing.
 */
const driverLicenseFields = {
  DCA: 'Jurisdiction-specific vehicle class',
  DCB: 'Jurisdiction-specific restriction codes',
  DCD: 'Jurisdiction-specific endorsement codes',
  DBA: 'Document Expiration Date',
  DCS: 'Customer Last Name',
  DAC: 'Customer First Name',
  DBD: 'Document Issue Date',
  DBB: 'Date of Birth',
  DBC: 'Physical Description - Sex',
  DAY: 'Physical Description - Eye Color',
  DAU: 'Physical Description - Height',
  DAG: 'Address - Street 1',
  DAI: 'Address - City',
  DAJ: 'Address - Jurisdiction Code',
  DAK: 'Address - Postal Code',
  DAQ: 'Customer ID Number',
  DCF: 'Document Discriminator',
  DCG: 'Country Identification',
  DDE: 'Family Name Truncation',
  DDF: 'First Names Truncation',
  DDG: 'Middle Names Truncation',
  DAH: 'Address - Street 2',
  DAZ: 'Hair Color',
  DCI: 'Place of birth',
  DCJ: 'Audit information',
  DCK: 'Inventory Control Number',
  DBN: 'Alias / AKA Family Name',
  DBG: 'Alias / AKA Given Name',
  DBS: 'Alias / AKA Suffix Name',
  DCU: 'Name Suffix',
  DCE: 'Physical Description Weight Range',
  DCL: 'Race / Ethnicity',
  DCM: 'Standard vehicle classification',
  DCN: 'Standard endorsement code',
  DCO: 'Standard restriction code',
  DCP: 'Jurisdiction-specific vehicle classification description',
  DCQ: 'Jurisdiction-specific endorsement code description',
  DCR: 'Jurisdiction-specific restriction code description',
  DDA: 'Compliance Type',
  DDB: 'Card Revision Date',
  DDC: 'HazMat Endorsement Expiration Date',
  DDD: 'Limited Duration Document Indicator',
  DAW: 'Weight(pounds)',
  DAX: 'Weight(kilograms)',
  DDH: 'Under 18 Until',
  DDI: 'Under 19 Until',
  DDJ: 'Under 21 Until',
  DDK: 'Organ Donor Indicator',
  DDL: 'Veteran Indicator',
  // old standard
  DAA: 'Customer Full Name',
  DAB: 'Customer Last Name',
  DAE: 'Name Suffix',
  DAF: 'Name Prefix',
  DAL: 'Residence Street Address1',
  DAM: 'Residence Street Address2',
  DAN: 'Residence City',
  DAO: 'Residence Jurisdiction Code',
  DAP: 'Residence Postal Code',
  DAR: 'License Classification Code',
  DAS: 'License Restriction Code',
  DAT: 'License Endorsements Code',
  DAV: 'Height in CM',
  DBE: 'Issue Timestamp',
  DBF: 'Number of Duplicates',
  DBH: 'Organ Donor',
  DBI: 'Non-Resident Indicator',
  DBJ: 'Unique Customer Identifier',
  DBK: 'Social Security Number',
  DBL: 'Date Of Birth',
  DBM: 'Social Security Number',
  DCH: 'Federal Commercial Vehicle Codes',
  DBO: 'Customer Last Name',
  DBP: 'Customer First Name',
  DBQ: 'Customer Middle Name(s)',
  DBR: 'Name Suffix',
  PAA: 'Permit Classification Code',
  PAB: 'Permit Expiration Date',
  PAC: 'Permit Identifier',
  PAD: 'Permit IssueDate',
  PAE: 'Permit Restriction Code',
  PAF: 'Permit Endorsement Code',
  ZVA: 'Court Restriction Code',
  DCT: 'Customer First Name',
  DAD: 'Customer Middle Name(s)'
};

/**
 * Parse driver license data from PDF417 text.
 *
 * @param {string} text - Raw PDF417 text from driver license.
 *
 * @returns {object} Parsed driver license information.
 */
function parseDLInfo(text) {
  const lines = text.split('\n');
  const abbrs = Object.keys(driverLicenseFields);
  const dlInfo = {raw: text};

  lines.forEach((line, i) => {
    let abbr;
    let content;

    if(i === 1) {
      abbr = 'DAQ';
      content = line.substring(line.indexOf(abbr) + 3);
    } else {
      abbr = line.substring(0, 3);
      content = line.substring(3).trim();
    }

    if(abbrs.includes(abbr)) {
      dlInfo[abbr] = {
        description: driverLicenseFields[abbr],
        value: content,
      };
    }
  });

  return dlInfo;
}

/**
 * Calculate optimal scanning region based on source dimensions.
 *
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} source -
 *   Source element to calculate region for.
 * @param {object} options - Region calculation options.
 * @param {number} options.regionScale - Scale factor for region size.
 *
 * @returns {object} Calculated region coordinates.
 */
function calculateScanRegion(source, options = {}) {
  const {regionScale = 0.4} = options;

  let width;
  let height;

  if(source instanceof HTMLVideoElement) {
    width = source.videoWidth || source.clientWidth;
    height = source.videoHeight || source.clientHeight;
  } else if(source instanceof HTMLImageElement) {
    width = source.naturalWidth || source.width;
    height = source.naturalHeight || source.height;
  } else if(source instanceof HTMLCanvasElement) {
    width = source.width;
    height = source.height;
  } else {
    // Default region - full area
    return {
      regionLeft: 0,
      regionTop: 0,
      regionRight: 100,
      regionBottom: 100,
      regionMeasuredByPercentage: 1
    };
  }

  const regionMaskEdgeLength = regionScale * Math.min(width, height);
  const left = (width - regionMaskEdgeLength) / 2 / width;
  const top = (height - regionMaskEdgeLength) / 2 / height;

  let regionLeft;
  let regionTop;

  if(width > height) {
    regionLeft = Math.round(left * 100) - 25;
    regionTop = Math.round(top * 100) - 5;
  } else {
    regionLeft = Math.round(left * 100) - 20;
    regionTop = Math.round(top * 100) - 5;
  }

  return {
    regionLeft: Math.max(0, regionLeft),
    regionTop: Math.max(0, regionTop),
    regionRight: Math.min(100, 100 - regionLeft),
    regionBottom: Math.min(100, 100 - regionTop),
    regionMeasuredByPercentage: 1
  };
}

/**
 * Enhanced PDF417 scanning plugin with Dynamsoft integration.
 */
export const enhancedPdf417Plugin = {
  format: 'pdf417_enhanced',

  /**
   * Scan source for PDF417 codes using enhanced algorithms.
   *
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
   *   ImageData|File} source - Source to scan.
   * @param {object} options - Plugin-specific options.
   * @param {AbortSignal} options.signal - Abort signal.
   * @param {string} options.license - Dynamsoft license key.
   * @param {boolean} options.useDynamsoft - Use Dynamsoft engine.
   * @param {boolean} options.parseDL - Parse driver license info.
   * @param {number} options.deblurLevel - Deblur level 1-9.
   * @param {number} options.regionScale - Region scale 0-1.
   * @param {boolean} options.useRegion - Enable region-based scanning.
   * @param {boolean} options.fallbackToBarcodeDetector - Fallback enabled.
   *
   * @returns {Promise<object[]>} Array of detected PDF417 codes.
   */
  async scan(source, options = {}) {
    const {
      signal,
      license,
      useDynamsoft = true,
      parseDL = false,
      deblurLevel = 9,
      regionScale = 0.4,
      useRegion = true,
      fallbackToBarcodeDetector = true
    } = options;

    // Check for abort
    signal?.throwIfAborted();

    let results = [];

    // Try Dynamsoft first (if enabled and license provided)
    if(useDynamsoft && license) {
      try {
        results = await scanWithDynamsoft(source, {
          signal,
          license,
          deblurLevel,
          regionScale,
          useRegion,
          parseDL
        });

        if(results.length > 0) {
          return results;
        }
      } catch(error) {
        console.warn('Dynamsoft scanning failed:', error.message);

        if(!fallbackToBarcodeDetector) {
          throw error;
        }
      }
    }

    // Fallback to BarcodeDetector API
    if(fallbackToBarcodeDetector) {
      try {
        results = await scanWithBarcodeDetector(source, {signal, parseDL});
      } catch(error) {
        if(error.name === 'AbortError') {
          throw error;
        }
        throw new Error(`PDF417 detection failed: ${error.message}`);
      }
    }

    return results;
  }
};

/**
 * Scan using Dynamsoft JavaScript Barcode SDK.
 *
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
 *   ImageData|File} source - Source to scan.
 * @param {object} options - Scanning options.
 * @param {AbortSignal} options.signal - Abort signal.
 * @param {string} options.license - Dynamsoft license key.
 * @param {number} options.deblurLevel - Deblur level.
 * @param {number} options.regionScale - Region scale.
 * @param {boolean} options.useRegion - Use region scanning.
 * @param {boolean} options.parseDL - Parse driver license.
 *
 * @returns {Promise<object[]>} Scan results.
 */
async function scanWithDynamsoft(source, options) {
  const {signal, license, deblurLevel, regionScale, useRegion, parseDL} =
    options;

  // Initialize Dynamsoft license
  if(!BarcodeReader.license) {
    BarcodeReader.license = license;
  }

  signal?.throwIfAborted();

  let reader;

  try {
    // Create BarcodeReader instance
    reader = await BarcodeReader.createInstance();

    // Configure runtime settings
    const settings = await reader.getRuntimeSettings();
    settings.barcodeFormatIds = EnumBarcodeFormat.BF_PDF417;
    settings.deblurLevel = deblurLevel;
    settings.localizationModes = [16, 8, 2, 0, 0, 0, 0, 0];

    // Apply region-based scanning if enabled
    if(useRegion) {
      settings.region = calculateScanRegion(source, {regionScale});
    }

    await reader.updateRuntimeSettings(settings);

    signal?.throwIfAborted();

    // Perform scanning
    let scanResults;

    if(source instanceof File) {
      // For file uploads, convert to appropriate format
      scanResults = await reader.decode(source);
    } else {
      // For video/image elements
      scanResults = await reader.decode(source);
    }

    signal?.throwIfAborted();

    // Transform results to standard format
    return scanResults.map(result => {
      const baseResult = {
        text: result.barcodeText,
        format: result.barcodeFormat,
        boundingBox: result.localizationResult?.resultPoints ?
          convertDynamstoftBounds(result.localizationResult.resultPoints) :
          null,
        cornerPoints: result.localizationResult?.resultPoints || null,
        confidence: result.confidence || null
      };

      // Add driver license parsing if requested
      if(parseDL) {
        baseResult.driverLicense = parseDLInfo(result.barcodeText);
      }

      return baseResult;
    });

  } finally {
    // Clean up resources
    if(reader) {
      reader.destroyContext();
    }
  }
}

/**
 * Scan using BarcodeDetector API (fallback method).
 *
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
 *   ImageData|File} source - Source to scan.
 * @param {object} options - Scanning options.
 * @param {AbortSignal} options.signal - Abort signal.
 * @param {boolean} options.parseDL - Parse driver license.
 *
 * @returns {Promise<object[]>} Scan results.
 */
async function scanWithBarcodeDetector(source, options) {
  const {signal, parseDL} = options;

  signal?.throwIfAborted();

  try {
    const detector = new BarcodeDetector({formats: ['pdf417']});
    const barcodes = await detector.detect(source);

    signal?.throwIfAborted();

    return barcodes.map(barcode => {
      const baseResult = {
        text: barcode.rawValue,
        format: barcode.format,
        boundingBox: barcode.boundingBox,
        cornerPoints: barcode.cornerPoints
      };

      // Add driver license parsing if requested
      if(parseDL) {
        baseResult.driverLicense = parseDLInfo(barcode.rawValue);
      }

      return baseResult;
    });

  } catch(error) {
    if(error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`BarcodeDetector PDF417 scanning failed: ${error.message}`);
  }
}

/**
 * Convert Dynamsoft bounding points to standard format.
 *
 * @param {object[]} resultPoints - Dynamsoft result points.
 *
 * @returns {object|null} Standard bounding box or null.
 */
function convertDynamstoftBounds(resultPoints) {
  if(!resultPoints || resultPoints.length < 4) {
    return null;
  }

  const xs = resultPoints.map(p => p.x);
  const ys = resultPoints.map(p => p.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

/**
 * Utility function to create driver license specific plugin instance.
 *
 * @param {string} licenseKey - Dynamsoft license key.
 *
 * @returns {object} Driver license plugin.
 */
export function createDriverLicensePlugin(licenseKey) {
  return {
    format: 'pdf417_dl',
    scan: async (source, options = {}) => {
      return enhancedPdf417Plugin.scan(source, {
        ...options,
        license: licenseKey,
        parseDL: true,
        useDynamsoft: true,
        deblurLevel: 9,
        useRegion: true
      });
    }
  };
}

// Export utilities
export {
  driverLicenseFields,
  parseDLInfo,
  calculateScanRegion
};
