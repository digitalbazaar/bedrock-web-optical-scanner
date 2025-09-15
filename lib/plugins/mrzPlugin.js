/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {MRZScanner} from 'dynamsoft-mrz-scanner';

/**
 * MRZ (Machine Readable Zone) scanning plugin using Dynamsoft MRZ Scanner.
 */
export const mrzPlugin = {
  format: 'mrz',

  /**
   * Scan source for MRZ data.
   *
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
   *   ImageData|File} source -
   *   Source to scan (image element, video element, canvas, or file).
   * @param {object} options - Plugin-specific options.
   * @param {AbortSignal} options.signal - Abort signal.
   * @param {string} options.licenseKey - Dynamsoft license key.
   * @param {object} options.scannerConfig - Additional scanner configuration.
   * @param {string} options.mrzMode - Scanning mode:
   *   'camera' | 'file' | 'element'.
   *
   * @returns {Promise<object[]>} Array of detected MRZ data.
   */
  async scan(source, options = {}) {
    console.log('=== MRZ PLUGIN DEBUG ===');
    console.log('Source type:', source?.constructor?.name);
    console.log('Options received:', options);
    console.log('License key:', options.licenseKey ? 'PROVIDED' : 'MISSING');
    console.log('MRZ Mode:', options.mrzMode);
    console.log('Scanner Config:', options.scannerConfig);
    console.log('Target Container:',
      options.scannerConfig?.targetContainer ? 'PROVIDED' : 'MISSING');
    console.log('========================');
    const {
      signal,
      licenseKey,
      scannerConfig = {},
      mrzMode = 'element' // Renamed from 'mode' to avoid conflict
    } = options;

    // Add this debug:
    console.log('MRZ Plugin: About to enter switch statement');
    console.log('MRZ Mode resolved to:', mrzMode);

    // Check for abort
    signal?.throwIfAborted();

    if(!licenseKey) {
      throw new Error('MRZ scanning requires a valid Dynamsoft license key');
    }

    try {
      let result;

      // Handle different scanning modes
      switch(mrzMode) {
        case 'camera':
          console.log('MRZ Plugin: Entering camera mode');
          result = await this._scanFromCamera(
            licenseKey, scannerConfig, signal
          );
          console.log('MRZ Plugin: Camera scan completed:', result);
          break;

        case 'file':
          if(!(source instanceof File)) {
            throw new Error('File mode requires a File object as source');
          }
          result = await this._scanFromFile(
            source,
            licenseKey,
            scannerConfig,
            signal
          );
          break;

        case 'element':
        default:
          if(!this._isValidImageSource(source)) {
            throw new Error(
              'Element mode requires HTMLImageElement, HTMLVideoElement, ' +
              'HTMLCanvasElement, or ImageData'
            );
          }
          result = await this._scanFromElement(
            source,
            licenseKey,
            scannerConfig,
            signal
          );
          break;
      }

      // Check for abort after scanning
      signal?.throwIfAborted();

      // Transform and validate result
      return this._transformResult(result);

    } catch(error) {
      if(error.name === 'AbortError') {
        throw error;
      }

      // Wrap other errors with more context
      throw new Error(`MRZ detection failed: ${error.message}`);
    }
  },

  /**
   * Scan MRZ from camera stream.
   *
   * @param {string} licenseKey - Dynamsoft license key.
   * @param {object} scannerConfig - Additional scanner configuration.
   * @param {AbortSignal} signal - Abort signal.
   * @returns {Promise<object>} MRZ scan result from camera.
   * @private
   */
  async _scanFromCamera(licenseKey, scannerConfig, signal) {
    console.log('_scanFromCamera called with:',
      {licenseKey: !!licenseKey, scannerConfig,
        targetContainer: !!scannerConfig.targetContainer});

    const {targetContainer, ...dynamSoftConfig} = scannerConfig;
    console.log('_scanFromCamera: targetContainer >> ', targetContainer);
    console.log('_scanFromCamera: dynamSoftConfig >> ', dynamSoftConfig);

    const mrzScanner = new MRZScanner({
      license: licenseKey,
      container: targetContainer,
      ...dynamSoftConfig,
      resultViewConfig: {
        ...dynamSoftConfig.resultViewConfig,
        onDone: result => {
          // Result will be handled in the promise resolution
          console.log('Dynamsoft onDone callback triggered:', result);
          return result;
        }
      }
    });

    console.log('MRZScanner created, about to call launch()');

    // Check for abort before scanning
    signal?.throwIfAborted();

    // DEBUG DOM Elements -- TESTING PURPOSE ONLY
    // setTimeout(() => {
    //   console.log('=== CONTAINMENT DEBUG ===');

    //   // Find all Dynamsoft-related elements
    // const allDynamSoftElements = document
    //   .querySelectorAll('[class*="dynamsoft"], [id*="dynamsoft"],' +
    //     '[class*="dce"], [id*="dce"], [class*="mrz"], [id*="mrz"]');

    //   // Check which ones are inside our container
    //   const elementsInsideContainer = [];
    //   const elementsOutsideContainer = [];

    //   allDynamSoftElements.forEach(el => {
    //     if (targetContainer && targetContainer.contains(el)) {
    //       elementsInsideContainer.push(el);
    //     } else {
    //       elementsOutsideContainer.push(el);
    //     }
    //   });

    // console.log(`Total Dynamsoft elements:
    //   ${allDynamSoftElements.length}`);
    // console.log(`Elements INSIDE container:
    //   ${elementsInsideContainer.length}`);
    // console.log(`Elements OUTSIDE container:
    //   ${elementsOutsideContainer.length}`);

    //   // Log elements outside container (these are problematic)
    //   if (elementsOutsideContainer.length > 0) {
    //    console.log('Elements outside container:');
    //    elementsOutsideContainer.forEach(el => {
    //      console.log(`   - ${el.tagName}.${el.className}
    //      (position: ${getComputedStyle(el).position})`);
    //    });
    //   }

    //   // Inline highlighting without helper function
    //   elementsInsideContainer.forEach((el, index) => {
    //     el.style.outline = '3px solid green';
    //     el.style.outlineOffset = '2px';
    //   });

    //   elementsOutsideContainer.forEach((el, index) => {
    //     el.style.outline = '3px solid red';
    //     el.style.outlineOffset = '2px';
    //   });

    //   // Check container dimensions
    //   const containerRect = targetContainer.getBoundingClientRect();
    //   console.log(`Container size:
    //      ${containerRect.width}x${containerRect.height}`);
    //   console.log(`Container position:
    //     top=${containerRect.top}, left=${containerRect.left}`);

    //   console.log('=== END CONTAINMENT DEBUG ===');
    // }, 3000);

    try {
      // Launch camera scanner UI (FIXED: using launch() instead of capture())
      const result = await mrzScanner.launch();
      console.log('MRZScanner.launch() completed:', result);

      // Check for abort after scanning
      signal?.throwIfAborted();

      return result;
    } catch(error) {
      console.error('MRZScanner.launch() error:', error);
      throw error;
    } finally {
      // Clean up resources
      if(mrzScanner.destroy) {
        mrzScanner.destroy();
      }
    }
  },

  /**
  * NOT IN USE --
  * Created this function to test various configurations
  * to avoid Dynamsoft Native Camera UI display.
  *
  * Scan MRZ from file.
  *
  * @param {File} file - The file to scan for MRZ data.
  * @param {string} licenseKey - Dynamsoft license key.
  * @param {object} scannerConfig - Additional scanner configuration.
  * @param {AbortSignal} signal - Abort signal.
  * @returns {Promise<object>} MRZ scan result from file.
  * @private
  */
  async _scanFromFile_v1(file, licenseKey, scannerConfig, signal) {
    return new Promise((resolve, reject) => {
      const mrzScanner = new MRZScanner({
        license: licenseKey,
        showResultView: false, // Hide result UI completely
        scannerViewConfig: {
          // Hide all scanner UI elements for silent operation
          showScanGuide: false,
          showUploadImage: false,
          showFormatSelector: false,
          showSoundToggle: false,
          showPoweredByDynamsoft: false,
          container: null // Don't attach to DOM
        },
        resultViewConfig: {
          // Handle results programmatically via callback
          onDone: result => {
            // Clean up resources
            if(mrzScanner.destroy) {
              mrzScanner.destroy();
            }
            resolve(result);
          },
          onCancel: () => {
            // Handle cancellation
            if(mrzScanner.destroy) {
              mrzScanner.destroy();
            }
            reject(new Error('MRZ scanning was cancelled'));
          }
        },
        ...scannerConfig
      });

      try {
        // Check for abort before scanning
        signal?.throwIfAborted();

        // Launch scanner - now runs silently without UI
        mrzScanner.launch(file).catch(error => {
          // Clean up on error
          if(mrzScanner.destroy) {
            mrzScanner.destroy();
          }
          reject(error);
        });

      } catch(error) {
        // Clean up on immediate error
        if(mrzScanner.destroy) {
          mrzScanner.destroy();
        }
        reject(error);
      }
    });
  },

  /**
   * Scan MRZ from file.
   *
   * @param {File} file - The file to scan for MRZ data.
   * @param {string} licenseKey - Dynamsoft license key.
   * @param {object} scannerConfig - Additional scanner configuration.
   * @param {AbortSignal} signal - Abort signal.
   * @returns {Promise<object>} MRZ scan result from file.
   * @private
   */
  async _scanFromFile(file, licenseKey, scannerConfig, signal) {
    const mrzScanner = new MRZScanner({
      license: licenseKey,
      ...scannerConfig
    });

    try {
      // Check for abort before scanning
      signal?.throwIfAborted();

      // FIXED: Launch with file directly (like in Vue component)
      const result = await mrzScanner.launch(file);

      return result;
    } finally {
      // Clean up resources
      if(mrzScanner.destroy) {
        mrzScanner.destroy();
      }
    }
  },

  /**
   * Scan MRZ from image/video/canvas element.
   *
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
   *   ImageData} source - The source element to scan.
   * @param {string} licenseKey - Dynamsoft license key.
   * @param {object} scannerConfig - Additional scanner configuration.
   * @param {AbortSignal} signal - Abort signal.
   * @returns {Promise<object>} MRZ scan result from element.
   * @private
   */
  async _scanFromElement(source, licenseKey, scannerConfig, signal) {
    // ISSUE: Dynamsoft MRZ Scanner appears to be UI-based only
    // It doesn't have a programmatic API for scanning arbitrary elements
    // We need to convert the element to a File or use a different approach

    try {
      // Check for abort before scanning
      signal?.throwIfAborted();

      // Convert image element to File for processing
      const file = await this._elementToFile(source);

      // Use file scanning method
      return await this._scanFromFile(file, licenseKey, scannerConfig, signal);

    } catch(error) {
      throw new Error(`Element scanning failed: ${error.message}`);
    }
  },

  /**
   * Convert image element to File for MRZ scanning.
   *
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
   *   ImageData} source - The source element to convert.
   * @returns {Promise<File>} Promise that resolves to a File object.
   * @private
   */
  async _elementToFile(source) {
    let canvas;

    if(source instanceof HTMLCanvasElement) {
      canvas = source;
    } else if(source instanceof ImageData) {
      canvas = this._imageDataToCanvas(source);
    } else if(source instanceof HTMLImageElement) {
      canvas = this._imageToCanvas(source);
    } else if(source instanceof HTMLVideoElement) {
      canvas = this._videoToCanvas(source);
    } else {
      throw new Error('Unsupported element type for conversion');
    }

    // Convert canvas to blob then to File
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if(blob) {
          const file = new File(
            [blob],
            'scan-image.png',
            {type: 'image/png'}
          );
          resolve(file);
        } else {
          reject(new Error('Failed to convert element to file'));
        }
      }, 'image/png');
    });
  },

  /**
   * Convert HTMLImageElement to canvas.
   *
   * @param {HTMLImageElement} img - The image element to convert.
   * @returns {HTMLCanvasElement} The resulting canvas element.
   * @private
   */
  _imageToCanvas(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
  },

  /**
   * Convert HTMLVideoElement to canvas.
   *
   * @param {HTMLVideoElement} video - The video element to convert.
   * @returns {HTMLCanvasElement} The resulting canvas element.
   * @private
   */
  _videoToCanvas(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || video.width;
    canvas.height = video.videoHeight || video.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas;
  },

  /**
   * Convert File to HTMLImageElement.
   *
   * @param {File} file - The file to convert to an image element.
   * @returns {Promise<HTMLImageElement>} Promise that resolves to an
   *   HTMLImageElement.
   * @private
   */
  _fileToImageElement(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image from file'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Convert ImageData to HTMLCanvasElement.
   *
   * @param {ImageData} imageData - The ImageData to convert.
   * @returns {HTMLCanvasElement} The resulting canvas element.
   * @private
   */
  _imageDataToCanvas(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  },

  /**
   * Check if source is a valid image source.
   *
   * @param {any} source - The source to check.
   * @returns {boolean} True if the source is a valid image source,
   *   false otherwise.
   * @private
   */
  _isValidImageSource(source) {
    return (
      source instanceof HTMLImageElement ||
      source instanceof HTMLVideoElement ||
      source instanceof HTMLCanvasElement ||
      source instanceof ImageData
    );
  },

  /**
   * Transform Dynamsoft MRZ result to standard plugin format.
   *
   * @param {object} dynamSoftResult - The result object from
   *   Dynamsoft MRZ Scanner.
   * @returns {object[]} Array of transformed MRZ scan results.
   * @private
   */
  _transformResult(dynamSoftResult) {
    if(!dynamSoftResult || !dynamSoftResult.data) {
      return [];
    }

    const mrzData = dynamSoftResult.data;

    // Analyze validation (extracted from Vue component logic)
    const validation = this._analyzeValidation(mrzData);

    // Transform to standard plugin result format
    const transformedResult = {
      text: mrzData.mrzText || '',
      format: 'mrz',
      data: {
        // Standard MRZ fields
        documentNumber: mrzData.documentNumber || '',
        firstName: mrzData.firstName || '',
        lastName: mrzData.lastName || '',
        dateOfBirth: this._formatDate(mrzData.dateOfBirth),
        dateOfExpiry: this._formatDate(mrzData.dateOfExpiry),
        nationality: mrzData.nationality || '',
        issuingState: mrzData.issuingState || '',
        sex: mrzData.sex || '',
        documentType: mrzData.documentType || '',
        age: mrzData.age || '',

        // Additional fields
        confidence: mrzData.confidence || 'N/A',
        rawMRZ: mrzData.mrzText || '',

        // Validation information
        validation,
        invalidFields: mrzData.invalidFields || []
      },
      metadata: {
        scanTime: new Date().toISOString(),
        scanner: 'dynamsoft-mrz',
        validationScore: validation.statistics.overallCompleteness,
        originalResult: dynamSoftResult
      }
    };

    return [transformedResult];
  },

  /**
   * Analyze MRZ validation (extracted from Vue component).
   *
   * @param {object} mrzData - The MRZ data object to analyze.
   * @returns {object} Validation analysis result.
   * @private
   */
  _analyzeValidation(mrzData) {
    const invalidFields = mrzData.invalidFields || [];

    // Define critical vs optional fields
    const criticalFields = [
      'documentNumber',
      'firstName',
      'lastName',
      'dateOfBirth',
      'dateOfExpiry'
    ];
    const optionalFields = [
      'nationality',
      'issuingState',
      'sex',
      'age',
      'documentType'
    ];
    const allFields = [...criticalFields, ...optionalFields];

    // Analyze field completeness
    const fieldAnalysis = allFields.map(fieldKey => {
      const hasValue = mrzData[fieldKey] && mrzData[fieldKey] !== '';
      const isInvalid = invalidFields.includes(fieldKey);
      const isCritical = criticalFields.includes(fieldKey);

      return {
        key: fieldKey,
        label: this._getFieldLabel(fieldKey),
        hasValue,
        isInvalid,
        isCritical,
        status: this._determineFieldStatus(hasValue, isInvalid, isCritical)
      };
    });

    // Calculate validation statistics
    const validCriticalFields = fieldAnalysis
      .filter(f => f.isCritical && f.status === 'valid')
      .length;
    const totalCriticalFields = criticalFields.length;
    const validOptionalFields = fieldAnalysis
      .filter(f => !f.isCritical && f.status === 'valid')
      .length;
    const totalOptionalFields = optionalFields.length;

    const criticalCompleteness =
      (validCriticalFields / totalCriticalFields) * 100;
    const optionalCompleteness =
      (validOptionalFields / totalOptionalFields) * 100;
    const overallCompleteness =
      ((validCriticalFields + validOptionalFields) / allFields.length) * 100;

    const statistics = {
      criticalCompleteness: Math.round(criticalCompleteness),
      optionalCompleteness: Math.round(optionalCompleteness),
      overallCompleteness: Math.round(overallCompleteness),
      totalFields: allFields.length,
      validFields: validCriticalFields + validOptionalFields,
      invalidFields: fieldAnalysis.filter(f => f.status === 'invalid').length,
      missingFields: fieldAnalysis.filter(f => f.status === 'missing').length
    };

    // Determine overall status
    let overallStatus = 'failed';
    if(criticalCompleteness === 100 && optionalCompleteness >= 80) {
      overallStatus = 'complete';
    } else if(criticalCompleteness >= 80) {
      overallStatus = 'partial';
    } else if(criticalCompleteness >= 50) {
      overallStatus = 'incomplete';
    }

    return {
      overallStatus,
      fieldAnalysis,
      statistics
    };
  },

  /**
   * Returns a human-readable label for a given MRZ field key.
   *
   * @param {string} key - The MRZ field key to convert to a label.
   * @returns {string} The human-readable label for the field.
   * @private
   */
  _getFieldLabel(key) {
    const labelMap = {
      documentNumber: 'Document Number',
      firstName: 'First Name',
      lastName: 'Last Name',
      dateOfBirth: 'Date of Birth',
      dateOfExpiry: 'Expiry Date',
      nationality: 'Nationality',
      issuingState: 'Issuing State',
      sex: 'Gender',
      age: 'Age',
      documentType: 'Document Type'
    };
    return labelMap[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase();
  },

  /**
   * Determine field validation status.
   *
   * @param {boolean} hasValue - Whether the field has a value.
   * @param {boolean} isInvalid - Whether the field is invalid.
   * @param {boolean} isCritical - Whether the field is critical.
   * @returns {string} The validation status for the field.
   * @private
   */
  _determineFieldStatus(hasValue, isInvalid, isCritical) {
    if(isInvalid) {
      return 'invalid';
    }
    if(!hasValue) {
      return isCritical ? 'missing' : 'optional_missing';
    }
    return 'valid';
  },

  /**
   * Format date object to string.
   *
   * @param {object} dateObj - The date object with year, month, and day
   *   properties.
   * @returns {string} The formatted date string in "YYYY-MM-DD" format,
   *   or empty string if invalid.
   * @private
   */
  _formatDate(dateObj) {
    if(!dateObj || typeof dateObj !== 'object') {
      return '';
    }
    const {year, month, day} = dateObj;
    if(!year || !month || !day) {
      return '';
    }
    return (
      `${year}-` +
      `${String(month).padStart(2, '0')}-` +
      `${String(day).padStart(2, '0')}`
    );
  }
};
