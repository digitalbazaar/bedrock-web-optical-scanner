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
  *  ImageData|File} source - Source to scan
  *  (image element, video element, canvas, or file).
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
    // console.log('Source type:', source?.constructor?.name);
    // console.log('Options received:', options);
    console.log('License key:', options.licenseKey ? 'PROVIDED' : 'MISSING');
    // console.log('MRZ Mode:', options.mrzMode);
    // console.log('Scanner Config:', options.scannerConfig);
    console.log('Target Container:',
      options.scannerConfig?.targetContainer ? 'PROVIDED' : 'MISSING');
    console.log('========================');

    const {
      signal,
      licenseKey,
      scannerConfig = {},
      mrzMode = options.mrzMode || 'element'
    } = options;

    // Debug Log
    // console.log('MRZ Plugin: About to enter switch statement');
    // console.log('MRZ Mode resolved to:', mrzMode);

    // Check for abort
    signal?.throwIfAborted();

    if(!licenseKey) {
      throw new Error('MRZ scanning requires a valid Dynamsoft license key');
    }

    try {
      let result;

      // TODO -- Need to test - element and file mode thoroughly.
      // camera mode is stable and tested.
      // Other modes tested in isolation - it works but need more review.

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
    // console.log('_scanFromCamera called with:',
    //    {licenseKey: !!licenseKey, scannerConfig,
    //    targetContainer: !!scannerConfig.targetContainer});

    const {container: targetContainer, ...dynamSoftConfig} = scannerConfig;
    // console.log('_scanFromCamera: targetContainer >> ', targetContainer);
    console.log('_scanFromCamera: dynamSoftConfig >> ', dynamSoftConfig);

    const mrzScanner = new MRZScanner({
      license: licenseKey,
      container: targetContainer,
      showResultView: false,
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

    try {
      // Launch camera scanner UI
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

  // TODO: _scanFromFile need more testing.
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
    // console.log('=== _scanFromFile ENTRY ===');
    // console.log('File:', file?.name, file?.size);
    // console.log('License key provided:', !!licenseKey);
    // console.log('Creating MRZScanner...');
    const mrzScanner = new MRZScanner({
      license: licenseKey,
      ...(scannerConfig || {}) // Handle undefined scannerConfig gracefully
    });
    console.log('_scanFromFile: MRZScanner created successfully');

    try {
      // Check for abort before scanning
      signal?.throwIfAborted();
      console.log('About to call mrzScanner.launch(file)...');

      const result = await mrzScanner.launch(file);
      console.log('_scanFromFile: MRZ scan result received:', !!result);
      // console.log('_scanFromFile: Result data:', result);

      return result;
    } catch(error) {
      console.log('MRZ scan error caught:', error.message);
      console.log('Error stack:', error.stack);
      throw error;
    } finally {
      console.log('Cleaning up MRZ scanner...');
      // Clean up resources
      if(mrzScanner.destroy) {
        mrzScanner.destroy();
      }
    }
  },

  // TODO: _scanFromElement - Need more testing.
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
      // DEBUG LOG
      console.log('=== ABOUT TO CALL _scanFromFile ===');
      // console.log('File created:', !!file, file?.name, file?.size);
      // console.log('_scanFromFile method exists:', typeof this._scanFromFile);

      // Use file scanning method
      return await this._scanFromFile(file, licenseKey, scannerConfig, signal);

    } catch(error) {
      // console.error('=== _scanFromElement CAUGHT ERROR ===');
      console.error('Error:', error);
      throw new Error(`Element scanning failed: ${error.message}`);
    }
  },

  // TODO: _elementToFile and all related nested functions - Need more testing.

  /**
  * Convert image element to File for MRZ scanning.
  *
  * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|
  *   ImageData} source - The source element to convert.
  * @returns {Promise<File>} Promise that resolves to a File object.
  * @private
  */
  async _elementToFile(source) {
    console.log('=== ELEMENT TO FILE DEBUG ===');
    // console.log('Source type:', source.constructor.name);
    // console.log('Is HTMLVideoElement:', source instanceof HTMLVideoElement);
    let canvas;

    if(source instanceof HTMLCanvasElement) {
      // console.log('Using canvas directly');
      canvas = source;
    } else if(source instanceof ImageData) {
      // console.log('Converting ImageData to canvas');
      canvas = this._imageDataToCanvas(source);
    } else if(source instanceof HTMLImageElement) {
      // console.log('Converting HTMLImageElement to canvas');
      canvas = this._imageToCanvas(source);
    } else if(source instanceof HTMLVideoElement) {
      // console.log('Converting HTMLVideoElement to canvas' +
      //   ' - CAPTURING VIDEO FRAME');
      canvas = this._videoToCanvas(source);
    } else {
      throw new Error('Unsupported element type for conversion');
    }

    // console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    // console.log('=== END ELEMENT TO FILE DEBUG ===');

    // Convert canvas to blob then to File
    return new Promise((resolve, reject) => {
      // console.log('=== CANVAS STATE DEBUG ===');
      // console.log('Canvas width/height:', canvas.width, canvas.height);
      // console.log('Canvas context exists:', !!canvas.getContext('2d'));

      // Try to read a pixel to verify canvas has data
      try {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, 1, 1);
        console.log('Canvas has pixel data:', imageData.data[0] !== undefined);
      } catch(e) {
        console.log('Canvas pixel read failed:', e.message);
      }

      // ENHANCED toBlob with timeout
      // console.log('About to call canvas.toBlob()...');
      let blobCallbackCalled = false;

      const timeoutId = setTimeout(() => {
        if(!blobCallbackCalled) {
          // console.log('canvas.toBlob() TIMEOUT - callback never called');
          reject(new Error('Canvas toBlob timeout'));
        }
      }, 12000);

      canvas.toBlob(blob => {
        blobCallbackCalled = true;
        clearTimeout(timeoutId);
        // console.log('=== BLOB CONVERSION RESULT ===');
        // console.log('Blob created:', !!blob);
        // console.log('Blob size:', blob?.size);
        // console.log('Blob type:', blob?.type);

        if(blob) {
          const file = new File(
            [blob],
            'scan-image.png',
            {type: 'image/png'}
          );
          // console.log('=== FILE CONVERSION DEBUG ===');
          // console.log('File created:', file.name, file.size);
          // console.log('File type:', file.type);
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
    // console.log('=== _videoToCanvas Entry ===');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || video.width;
    canvas.height = video.videoHeight || video.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    // console.log('=== _videoToCanvas: canvas =>', canvas);
    // console.log('=== _videoToCanvas Exit ===');
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

    // Analyze validation
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
  * Analyze MRZ validation.
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
