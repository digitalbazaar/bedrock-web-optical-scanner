/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import * as cameraUtils from './utils/camera.js';
import {
  enhancedPdf417Plugin,
  mrzPlugin,
  pdf417Plugin,
  qrCodePlugin
} from './plugins/index.js';
import {EventEmitter} from 'events';
import {OpticalScanner} from './optical-scanner.js';

/**
* High-level camera scanner that provides a simple API for framework
* integration. Handles all scanning complexities internally - frameworks
* just handle UI. V3.
*/
export class CameraScanner extends EventEmitter {
  constructor(options = {}) {
    super(); // Call parent

    // Extract configuration options
    const {
      scanType = options.scanType || 'barcode', // 'mrz' | 'barcode' | 'auto'
      mrzMode = options.mrzMode || (scanType === 'mrz' ? 'camera' : 'element'),
      licenseKey = '', // Dynamsoft license key
      scanMode = options.scanMode || 'first' // 'first' | 'all' | 'exhaustive'
    } = options;

    // Validate scanType
    if(!['mrz', 'barcode', 'auto'].includes(scanType)) {
      throw new Error('scanType must be "mrz" or "barcode" or "auto"');
    }

    // Validate mrzMode
    if(!['camera', 'element', 'file'].includes(mrzMode)) {
      throw new Error('mrzMode must be "camera", "element", or "file"');
    }

    // Validate scanMode
    if(!['first', 'all', 'exhaustive'].includes(scanMode)) {
      throw new Error('scanMode must be "first", "all", or "exhaustive"');
    }

    // Store configuration
    this.config = {
      scanType,
      mrzMode,
      licenseKey,
      scanMode
    };

    // ===== INTERNAL STATE =====
    this._stream = null;
    this._videoElement = null;
    this._container = null; // Store container for plugin options
    this._opticalScanner = null;
    this._isScanning = false;
    this._torchState = false;
    this._zoomLevel = 1;

    // ===== INITIALIZE SCANNER =====
    this._initializeScanner();
    console.log('CameraScanner initialized with config:', this.config);
  }

  /**
  * Initialize the underlying optical scanner with plugins.
  * Simplified version without over-abstraction.
  *
  * @private
  */
  _initializeScanner() {
    // console.log('_initializeScanner entry...');

    try {
      // ===== GET PLUGINS FOR SCAN TYPE =====
      const plugins = this._getPluginsForScanType();

      // ===== CREATE OPTICAL SCANNER =====
      this._opticalScanner = new OpticalScanner({plugins});

      // console.log('Available formats:',
      //   this._opticalScanner.getSupportedFormats());

    } catch(error) {
      console.error('CameraScanner initialization error:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  /**
  * Get formats array based on scan type.
  *
  * @private
  * @param {string} scanType - Scan type.
  * @returns {string[]} Array of format strings.
  */
  _getFormats(scanType) {
    switch(scanType) {
      case 'mrz':
        return ['mrz'];

      case 'barcode':
        return ['qr_code', 'pdf417_enhanced', 'pdf417'];

      case 'auto':
        return ['qr_code', 'pdf417_enhanced', 'pdf417', 'mrz'];

      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
  }

  /**
  * Build plugin options based on formats array.
  *
  * @private
  * @param {string[]} formats - Array of formats to configure.
  * @param {string} licenseKey - License key.
  * @param {HTMLElement} container - Container element
  *  (needed for MRZ plugin config).
  * @param {string} mrzMode - MRZ mode (needed for MRZ plugin config).
  * @returns {object} Plugin options object.
  */
  _buildPluginOptions(formats, licenseKey, container, mrzMode) {
    const pluginOptions = {};

    // Only build options if license key is provided
    if(!licenseKey) {
      console.log('No license key provided');
      return pluginOptions;
    }

    // Build plugin options for each format
    formats.forEach(format => {
      switch(format) {
        case 'mrz':
          pluginOptions.mrz =
            this._buildMrzPluginOptions(licenseKey, container, mrzMode);
          // console.log('MRZ plugin configured');
          break;

        case 'pdf417_enhanced':
          pluginOptions.pdf417_enhanced = {
            licenseKey,
            useDynamsoft: true,
            parseDL: true // Parse driver license data
          };
          // console.log('Enhanced PDF417 plugin configured');
          break;

        // Standard plugins don't need special options
        case 'qr_code':
        case 'pdf417':
          // These use default plugin behavior
          break;

        default:
          console.log(`No special plugin options needed for format: ${format}`);
      }
    });

    // console.log('Built plugin options for formats:', formats.join(', '));
    return pluginOptions;
  }

  /**
  * Build MRZ plugin options based on mode.
  *
  * @private
  * @param {string} licenseKey - License key.
  * @param {HTMLElement} container - Container element.
  * @param {string} mrzMode - MRZ mode.
  * @returns {object} MRZ plugin options.
  */
  _buildMrzPluginOptions(licenseKey, container, mrzMode) {
    switch(mrzMode) {
      case 'camera':
        // MRZ camera mode > container ref + native UI config
        const scannerViewConfig = {
          enableAutoCapture: true,
          autoCaptureSensitivity: 0.8,
          documentDetection: true,
          stableDetectionCount: 3,
          showScanGuide: true,
          showUploadImage: false,
          showFormatSelector: false,
          showSoundToggle: false,
          showPoweredByDynamsoft: false
        };

        const resultViewConfig = {
          showResult: false,
          enableResultVerification: true
        };

        return {
          licenseKey,
          mrzMode,
          scannerConfig: {
            container, // Critical for Dynamsoft native UI
            scannerViewConfig,
            resultViewConfig
          }
        };

      case 'element':
        // MRZ element mode > element mode config
        return {
          licenseKey,
          mrzMode
          // No scannerConfig needed for element mode
        };

      case 'file':
        // MRZ file mode > file mode config
        return {
          licenseKey,
          mrzMode
        };

      default:
        throw new Error(`Unknown MRZ mode: ${mrzMode}`);
    }
  }

  /**
  * Get timeout configuration based on scan type, mode, and formats.
  *
  * @private
  * @param {string} scanType - Scan type ('mrz' | 'barcode' | 'auto').
  * @param {string} mrzMode - MRZ mode ('camera' | 'element' | 'file').
  * @param {string[]} formats - Array of formats being scanned.
  * @returns {number} Timeout in milliseconds (0 = no timeout).
  */
  _getTimeout(scanType, mrzMode, formats) {
    if(scanType === 'mrz' || formats.includes('mrz')) {
      // MRZ camera: 0ms (user-driven)
      if(mrzMode === 'camera') {
        return 0;
      }
      // MRZ element: 30s (complex processing)
      return 30000;
    }

    if(scanType === 'barcode') {
      // PDF417 enhanced: 20s (DL parsing)
      if(formats.includes('pdf417_enhanced')) {
        return 20000;
      }
      // Standard: 10s (basic scanning)
      return 10000;
    }

    if(scanType === 'auto') {
      return 12000;
    }

    // Default fallback
    return 15000;
  }

  /**
  * Determine scanning mode based on scan type.
  *
  * @private
  * @param {string} scanType - Scan type.
  * @returns {boolean} True for continuous scanning, false for single.
  */
  _determineScanningMode(scanType) {
    // MRZ > single scan (both camera & element)
    if(scanType === 'mrz') {
      return false;
    }

    // Barcode > continuous scan
    if(scanType === 'barcode') {
      return true;
    }

    // Auto > single scan (tries all formats continuously)
    if(scanType === 'auto') {
      return false;
    }

    // Default to single scan
    return false;
  }

  /**
  * Get plugins based on scan type.
  *
  * @private
  * @returns {Array} Array of plugin objects.
  */
  _getPluginsForScanType() {
    const allPlugins = [
      qrCodePlugin,
      pdf417Plugin,
      enhancedPdf417Plugin,
      mrzPlugin
    ].filter(plugin => plugin); // Filter out undefined

    // Filter plugins based on scanType
    switch(this.config.scanType) {
      case 'mrz':
        return [mrzPlugin].filter(plugin => plugin);

      case 'barcode':
        return [qrCodePlugin, pdf417Plugin, enhancedPdf417Plugin]
          .filter(plugin => plugin);

      case 'auto':
        return allPlugins; // All available plugins

      default:
        throw new Error(`Unknown scanType: ${this.config.scanType}`);
    }
  }

  /**
  * Start camera and handle complete container management.
  *
  * @param {HTMLElement} container - Container from Vue.
  * @param {object} options - Start options.
  * @param {boolean} options.autoScan - Auto-start scanning after
  *  setup (default: false).
  * @returns {Promise<object>} Status object with success and strategy info.
  */
  async start(container, options = {}) {
    const {autoScan = false} = options;

    console.log('=== CAMERA SCANNER START ===');
    console.log('Scan type:', this.config.scanType);
    console.log('MRZ mode:', this.config.mrzMode);
    console.log('Container provided:', !!container);
    console.log('Auto-scan requested:', autoScan);

    // ===== VALIDATION =====
    if(!container) {
      throw new Error('Container element is required to start camera.');
    }

    if(!(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid DOM element');
    }

    // Return existing setup if already started
    if(this._stream && this._container) {
      console.log('Camera already started, returning existing setup');
      return {
        success: true,
        videoReady: !!this._videoElement,
        scanType: this.config.scanType,
        mrzMode: this.config.mrzMode,
        autoScanStarted: false // Don't auto-start if already running
      };
    }

    try {
      // ===== EXISTING SETUP LOGIC =====
      this._container = container;
      // console.log('Container stored for plugin configuration');

      const formats = this._getFormats(this.config.scanType);
      // console.log('Formats determined:', formats);

      // ===== CONTAINER SETUP =====
      if(this.config.scanType === 'mrz' && this.config.mrzMode === 'camera') {
        console.log('MRZ camera mode - Dynamsoft will manage container');
      } else {
        console.log(`Setting up video element for` +
          `${this.config.scanType} scanning`);
        await this._setupVideoElement(container);
      }

      this._pluginOptions = this._buildPluginOptions(
        formats,
        this.config.licenseKey,
        container,
        this.config.mrzMode
      );
      // console.log('Plugin options built with container reference');

      // ===== AUTO-START LOGIC =====
      let autoScanStarted = false;
      if(autoScan) {
        console.log('Auto-starting scanning based on scanType:',
          this.config.scanType);

        // Start scanning in the background (non-blocking)
        setTimeout(() => {
          this.scan(options).catch(error => {
            console.log('Auto-scan completed or failed:', error.message);
            // let the scan method handle errors through events
          });
        }, 100); // Small delay to ensure start() completes first

        autoScanStarted = true;
      }

      // ===== RETURN SUCCESS STATUS =====
      const result = {
        success: true,
        videoReady: !!this._videoElement,
        scanType: this.config.scanType,
        mrzMode: this.config.mrzMode,
        formats,
        autoScanStarted // indicates if auto-scan was initiated
      };

      // console.log('=== CAMERA SCANNER START COMPLETED ===');
      return result;

    } catch(error) {
      // ===== ERROR HANDLING ===== (unchanged)
      console.error('CameraScanner.start() failed:', error);
      this.stop();

      return {
        success: false,
        scanType: this.config.scanType,
        mrzMode: this.config.mrzMode,
        error: this._formatStartError(error),
        autoScanStarted: false
      };
    }
  }

  /**
  * Start scanning manually.
  * Useful when autoScan was disabled or to restart scanning.
  *
  * @param {object} options - Same options as scan() method.
  * @returns {Promise<object>} Scan result.
  */
  async startScanning(options = {}) {
    if(!this._container) {
      throw new Error('Camera not started. Call start() first' +
        ' before starting scanning.');
    }

    console.log('Manual scanning initiated');
    return this.scan(options);
  }

  /**
  * Setup video element in container.
  *
  * @private
  * @param {HTMLElement} container - Container element.
  */
  async _setupVideoElement(container) {
    // Create camera stream
    const constraints = cameraUtils.getDefaultConstraints();
    this._stream = await cameraUtils.startCameraStream(constraints);

    // Create video element
    this._videoElement = await cameraUtils.createVideoElement(this._stream, {
      autoplay: true,
      muted: true,
      playsInline: true
    });

    // Style video for container
    this._videoElement.style.width = '100%';
    this._videoElement.style.height = '100%';
    this._videoElement.style.objectFit = 'cover';

    // Insert video element into container
    container.appendChild(this._videoElement);

    console.log('Video element created and inserted into container');
  }

  /**
  * Format start error into user-friendly message.
  *
  * @private
  * @param {Error} error - Original error.
  * @returns {string} User-friendly error message.
  */
  _formatStartError(error) {
    if(error.name === 'NotAllowedError') {
      return 'Camera permission denied. Please allow camera access' +
        ' and try again.';
    } else if(error.name === 'NotFoundError') {
      return 'No camera found. Please connect a camera and try again.';
    } else if(error.message.includes('timeout')) {
      return 'Camera initialization timed out. Please try again.';
    } else if(error.message.includes('Container')) {
      return 'Invalid container provided for camera display.';
    } else {
      return 'Failed to start camera. Please check your camera and try again.';
    }
  }

  /**
  * Scan for specific formats based on scanType configuration.
  * Uses targeted format selection for faster, focused scanning.
  *
  * @param {object} [options] - Scan options (e.g., {signal} for aborting).
  * @returns {Promise<object>} Formatted scan result.
  */
  async scan(options = {}) {
    console.log('=== CAMERA SCANNER SCAN ENTRY ===');
    // console.log('Scan type:', this.config.scanType);
    // console.log('MRZ mode:', this.config.mrzMode);

    // ===== EXTRACT SIGNAL FROM OPTIONS =====
    const {signal} = options;

    // ===== EARLY ABORT CHECK =====
    signal?.throwIfAborted();

    // ===== VALIDATION =====
    if(!this._opticalScanner) {
      throw new Error('Scanner not initialized. Call start() first.');
    }

    if(!this._container) {
      throw new Error('Camera not started. Call start() first.');
    }

    // Prevent multiple simultaneous scans
    if(this._isScanning) {
      throw new Error('Scan already in progress. Wait for current' +
        ' scan to complete.');
    }

    this._isScanning = true;

    try {
      // ===== GET CONFIGURATION USING PRIVATE METHODS =====
      const formats = this._getFormats(this.config.scanType);
      // TODO: options.timeoutMs - TEST & VERIFY THIS RECEIVES CORRECT VALUES.
      const timeoutMs = options.timeoutMs;
      // this._getTimeout(this.config.scanType, this.config.mrzMode, formats);
      const useContinuous =
        this._determineScanningMode(this.config.scanType);
      const scanSource = this._getScanSource();

      console.log('Scan configuration:', {
        formats,
        timeoutMs: timeoutMs + 'ms',
        useContinuous,
        scanSource: scanSource?.constructor?.name || 'undefined'
      });

      // ===== DIRECT DELEGATION TO OPTICAL SCANNER =====
      let results;

      // TODO: scanContinuous and scan functions -- pass options directly
      // from CameraScanner.scan(options) > OpticalScanner.scan(options)
      // and CameraScanner.scan(options) >
      // OpticalScanner.scanContinuous(options)
      // avoid creating options in between.

      if(useContinuous) {
        // BARCODE > Continuous scanning
        console.log('Delegating to OpticalScanner.scanContinuous()');
        results = await this._opticalScanner.scanContinuous(scanSource, {
          formats,
          mode: this.config.scanMode,
          pluginOptions: this._pluginOptions,
          timeoutMs,
          signal
        });
      } else {
        // MRZ > Single scan
        console.log('Delegating to OpticalScanner.scan()');
        results = await this._opticalScanner.scan(scanSource, {
          formats,
          mode: this.config.scanMode,
          pluginOptions: this._pluginOptions,
          timeoutMs,
          signal
        });
      }

      // ===== FORMAT AND RETURN RESULTS =====
      const result = this._formatScanResults(results);

      // === Emit result event ===
      this.emit('result', result);
      return result;

    } catch(error) {
      console.error('Specific format scan failed:', error);

      const formattedError = this._formatScanError(error);

      // === Emit error event ===
      this.emit('error', {
        message: formattedError.message,
        code: formattedError.code || 'SCAN_ERROR'
      });
      throw formattedError;

    } finally {
      this._isScanning = false;
    }
  }

  // TODO: Test thoroughly scanAny() for scanType = 'auto' mode.
  // For future use - to avoid multiple buttons on the UI to trigger specific
  // format scan.
  // Try to simply delegate to OpticalScanner.scanAny().

  /**
  * Scan for any supported format (auto-detect mode).
  * Tries all available formats and returns first successful match.
  *
  * @param {object} [options] - Scan options (e.g., {signal} for aborting).
  * @returns {Promise<object>} Formatted scan result.
  */
  async scanAny(options = {}) {
    console.log('=== CAMERA SCANNER SCAN ANY (AUTO-DETECT) ===');

    // ===== EXTRACT SIGNAL FROM OPTIONS =====
    const {signal} = options;

    // ===== EARLY ABORT CHECK =====
    signal?.throwIfAborted();

    // ===== VALIDATION =====
    if(!this._opticalScanner) {
      throw new Error('Scanner not initialized. Call start() first.');
    }

    if(!this._container) {
      throw new Error('Camera not started. Call start() first.');
    }

    // Prevent multiple simultaneous scans
    if(this._isScanning) {
      throw new Error('Scan already in progress. Wait for current scan' +
        ' to complete.');
    }

    this._isScanning = true;

    try {
      // ===== GET CONFIGURATION FOR AUTO-DETECT =====

      // Use a reasonable timeout for auto-detect mode
      const scanSource = this._getScanSource();
      const allFormats = this._opticalScanner.getSupportedFormats();
      // Use timeout based on current scan type, but with all available formats
      const timeoutMs =
        this._getTimeout(this.config.scanType, this.config.mrzMode, allFormats);

      console.log('Auto-detect configuration:', {
        allFormats,
        timeoutMs: timeoutMs + 'ms',
        scanSource: scanSource?.constructor?.name || 'undefined'
      });

      // ===== DIRECT DELEGATION TO OPTICAL SCANNER =====
      console.log('Delegating to OpticalScanner.scanAny()');

      // TODO: scanAny functions -- pass options directly
      // from CameraScanner.scanAny(options) > OpticalScanner.scanAny(options)
      // avoid creating options in between.

      const results = await this._opticalScanner.scanAny(scanSource, {
        mode: 'first', // First successful format wins
        pluginOptions: this._pluginOptions,
        timeoutMs,
        signal
      });

      // ===== AUTO-STOP CAMERA AFTER SUCCESSFUL SCAN =====
      if(results && results.length > 0) {
        console.log('CameraScanner: Auto-stopping camera after ' +
          'successful');
        this.stop();
      }

      // ===== FORMAT AND RETURN RESULTS =====
      return this._formatScanResults(results);

    } catch(error) {
      console.error('Auto-detect scan failed:', error);
      throw this._formatScanError(error);
    } finally {
      this._isScanning = false;
    }
  }

  /**
  * Get scan source based on scan type and mode.
  *
  * @private
  * @returns {HTMLVideoElement|HTMLElement|MediaStream} Scan source.
  */
  _getScanSource() {
    const {scanType, mrzMode} = this.config;

    // For MRZ camera mode, Dynamsoft might need the container
    if(scanType === 'mrz' && mrzMode === 'camera') {
      return this._container;
    }

    // For video-based modes, use the video element
    if(this._videoElement) {
      return this._videoElement;
    }

    // Fallback to stream if available
    if(this._stream) {
      return this._stream;
    }

    throw new Error('No scan source available - camera not properly' +
      ' initialized');
  }

  // ===== FORMAT RESULT =====
  /**
   * Format scan results into display-ready format.
   * Handles both single results and result arrays.
   *
   * @private
   * @param {Array|object} results - Raw scan results from OpticalScanner.
   * @returns {object} Formatted result ready for Vue display.
   */
  _formatScanResults(results) {
    if(!results) {
      throw new Error('No results to format');
    }

    // Handle array of results (get first successful result)
    const result = Array.isArray(results) ? results[0] : results;

    if(!result) {
      throw new Error('No valid result in results array');
    }

    console.log('Formatting scan result:', result.format);

    // Base result object with CameraScanner context
    const baseResult = {
      success: true,
      scanType: this.config.scanType,
      mrzMode: this.config.mrzMode,
      format: result.format,
      timestamp: new Date().toISOString()
    };

    // Format-specific processing
    switch(result.format) {
      case 'mrz':
        return this._formatMrzResult(baseResult, result);
      case 'pdf417_enhanced':
        return this._formatDriverLicenseResult(baseResult, result);
      case 'pdf417':
        return this._formatPdf417Result(baseResult, result);
      case 'qr_code':
        return this._formatQrCodeResult(baseResult, result);
      default:
        return {
          ...baseResult,
          type: result.format.toUpperCase(),
          text: result.text || result.data || 'Unknown format data'
        };
    }
  }

  /**
   * Format MRZ scan result.
   *
   * @private
   * @param {object} baseResult - Base result object.
   * @param {object} result - Raw MRZ result.
   * @returns {object} Formatted MRZ result.
   */
  _formatMrzResult(baseResult, result) {
    // Extract MRZ data
    const mrzData = result.data?.[0]?.data || {};
    const validation = result.data?.[0]?.data?.validation ||
      result.data?.[0]?.validation || {};
    const invalidFields = result.data?.[0]?.data?.invalidFields ||
      result.data?.[0]?.invalidFields || [];

    const isValid = validation.overallStatus === 'complete' ||
      (validation.overallStatus === 'partial' && invalidFields.length === 0);

    return {
      ...baseResult,
      type: 'MRZ',
      fields: mrzData,
      valid: isValid,
      validation,
      invalidFields,
      rawData: result.data
    };
  }

  /**
  * Format driver license result.
  *
  * @private
  * @param {object} baseResult - Base result object.
  * @param {object} result - Raw driver license result.
  * @returns {object} Formatted driver license result.
  */
  _formatDriverLicenseResult(baseResult, result) {
    let driverLicenseData = null;
    let rawText = '';

    if(result.data && result.data[0] && result.data[0].driverLicense) {
      driverLicenseData = result.data[0].driverLicense;
      rawText = result.data[0].text || driverLicenseData.raw || '';
    } else if(result.driverLicense) {
      driverLicenseData = result.driverLicense;
      rawText = result.text || '';
    }

    return {
      ...baseResult,
      type: 'DL',
      fields: driverLicenseData || {},
      parsed: !!driverLicenseData,
      text: rawText || 'Enhanced PDF417 with parsed data',
      rawData: result.data
    };
  }

  /**
   * Format PDF417 result.
   *
   * @private
   * @param {object} baseResult - Base result object.
   * @param {object} result - Raw PDF417 result.
   * @returns {object} Formatted PDF417 result.
   */
  _formatPdf417Result(baseResult, result) {
    let pdf417Text = result.text;

    if(!pdf417Text && result.data && Array.isArray(result.data)) {
      const firstData = result.data[0];
      if(typeof firstData === 'string') {
        pdf417Text = firstData;
      } else if(firstData && firstData.text) {
        pdf417Text = firstData.text;
      } else if(firstData && firstData.rawValue) {
        pdf417Text = firstData.rawValue;
      }
    }

    return {
      ...baseResult,
      type: 'PDF_417',
      text: pdf417Text || 'No PDF417 text found',
      rawData: result.data
    };
  }

  /**
  * Format QR code result.
  *
  * @private
  * @param {object} baseResult - Base result object.
  * @param {object} result - Raw QR result.
  * @returns {object} Formatted QR result.
  */
  _formatQrCodeResult(baseResult, result) {
    let qrText = result.text;

    if(!qrText && result.data && Array.isArray(result.data)) {
      const firstData = result.data[0];
      if(typeof firstData === 'string') {
        qrText = firstData;
      } else if(firstData && firstData.text) {
        qrText = firstData.text;
      } else if(firstData && firstData.rawValue) {
        qrText = firstData.rawValue;
      }
    }

    return {
      ...baseResult,
      type: 'QR_CODE',
      text: qrText || 'No QR code text found',
      rawData: result.data
    };
  }

  /**
  * Format scan error into user-friendly message.
  *
  * @private
  * @param {Error} error - Original error.
  * @returns {Error} Formatted error.
  */
  _formatScanError(error) {
    let userMessage;
    let errorCode;

    if(error.message === 'SCAN_TIMEOUT' || error.message.includes('timeout')) {
      userMessage = 'Scan timed out. Try repositioning or improving lighting.';
      errorCode = 'SCAN_TIMEOUT';
    } else if(error.message.includes('No results') ||
        error.message.includes('not found')) {
      userMessage = 'No optical codes detected. Try repositioning' +
        ' the document.';
      errorCode = 'NO_RESULTS';
    } else if(error.name === 'AbortError') {
      userMessage = 'Scan was cancelled.';
      errorCode = 'SCAN_CANCELLED';
    } else {
      userMessage = error.message || 'Scanning failed. Please try again.';
      errorCode = 'SCAN_ERROR';
    }

    const formattedError = new Error(userMessage);
    formattedError.code = errorCode;
    formattedError.originalError = error;
    return formattedError;
  }

  stop() {
    // Clean up resources
    this._isScanning = false;

    if(this._stream) {
      this._stream.getTracks().forEach(track => track.stop());
      this._stream = null;
    }

    if(this._videoElement) {
      this._videoElement.srcObject = null;
      this._videoElement = null;
    }

    this._container = null;
    console.log('CameraScanner stopped and cleaned up');
  }

  // ===== OVER ENGINEERING SECTION =====
  // FIXME: UNNECESSARY WRAPPER FUNCTIONS NEED MORE THINKING TO SIMPLIFY

  // Current: Just calls cameraUtils.getCameraCapabilities(this._stream)
  // Solution: Remove function. Vue component should call
  // cameraUtils.getCameraCapabilities(stream) directly
  // Reason: No added business logic, just pass-through

  /**
  * Get current camera capabilities.
  * Delegates to cameraUtils.getCameraCapabilities().
  *
  * @returns {object} An object containing camera capability information
  *  such as zoom, torch, and zoomRange.
  */
  getCameraCapabilities() {
    if(!this._stream) {
      return {
        zoom: false,
        torch: false,
        zoomRange: null
      };
    }

    try {
      return cameraUtils.getCameraCapabilities(this._stream);
    } catch(error) {
      console.error('Error getting camera capabilities:', error);
      return {
        zoom: false,
        torch: false,
        zoomRange: null
      };
    }
  }

  // Current: Just calls cameraUtils.getCameraList()
  // Solution: Remove function.
  // Vue component should call cameraUtils.getCameraList() directly
  // Reason: No added business logic, just pass-through

  /**
  * Get list of available camera devices.
  * Delegates to cameraUtils.getCameraList().
  *
  * @returns {Promise<Array>} A promise that resolves to an array of
  *  available camera devices.
  */
  async getCameraList() {
    try {
      return await cameraUtils.getCameraList();
    } catch(error) {
      console.error('Error getting camera list:', error);
      return [];
    }
  }

  /**
  * Toggle or set torch (flashlight) state.
  * Delegates to cameraUtils.applyCameraConstraints().
  *
  * @param {boolean} [enabled] - If true, enables torch; if false,
  *  disables torch; if undefined, toggles current state.
  * @returns {Promise<boolean>} A promise that resolves to the new
  *  torch state (true if enabled, false if disabled).
  */
  async setTorch(enabled) {
    if(!this._stream) {
      throw new Error('Camera not started. Call start()' +
        'first to control torch.');
    }

    // Get current capabilities to check if torch is supported
    const capabilities = cameraUtils.getCameraCapabilities(this._stream);
    if(!capabilities.torch) {
      throw new Error('Torch/flashlight not supported by current camera');
    }

    // Determine target state (toggle if not specified)
    const currentState = this._torchState || false;
    const targetState = enabled !== undefined ? enabled : !currentState;

    try {
      console.log(`Setting torch: ${currentState} -> ${targetState}`);

      // Apply torch constraint using camera utilities
      await cameraUtils.applyCameraConstraints(this._stream, {
        torch: targetState
      });

      // Update internal state
      this._torchState = targetState;

      console.log(`Torch ${targetState ? 'enabled' : 'disabled'} successfully`);
      return targetState;

    } catch(error) {
      console.error('Torch control error:', error);
      throw new Error(
        `Failed to ${targetState ? 'enable' : 'disable'} torch: ` +
        error.message
      );
    }
  }

  /**
  * Set camera zoom level.
  * Delegates to cameraUtils.applyCameraConstraints().
  *
  * @param {number} level - The desired zoom level to set.
  * @returns {Promise<number>} A promise that resolves to the new zoom level.
  */
  async setZoom(level) {
    if(!this._stream) {
      throw new Error(
        'Camera not started. Call start() first to control zoom.'
      );
    }

    // Get current capabilities to check zoom support and range
    const capabilities = cameraUtils.getCameraCapabilities(this._stream);
    if(!capabilities.zoom) {
      throw new Error('Zoom not supported by current camera');
    }

    // Validate zoom level is within supported range
    const {min = 1, max = 8} = capabilities.zoomRange || {};
    if(level < min || level > max) {
      throw new Error(
        `Zoom level ${level} outside supported range ${min}-${max}`
      );
    }

    try {
      const currentLevel = this._zoomLevel || 1;
      console.log(`Setting zoom: ${currentLevel} -> ${level}`);

      // Apply zoom constraint using camera utilities
      await cameraUtils.applyCameraConstraints(this._stream, {
        zoom: level
      });

      // Update internal state
      this._zoomLevel = level;

      console.log(`Zoom set to ${level} successfully`);
      return level;

    } catch(error) {
      console.error('Zoom control error:', error);
      throw new Error(`Failed to set zoom to ${level}: ${error.message}`);
    }
  }

  /**
  * Switch to a different camera device.
  * Recreates camera stream with new device ID.
  *
  * @param {string} deviceId - The device ID of the camera to switch to.
  * @returns {Promise<HTMLVideoElement>} A promise that resolves to the
  *  updated video element.
  */
  async switchCamera(deviceId) {
    if(!deviceId) {
      throw new Error('Device ID is required for camera switching');
    }

    // Validate device ID exists in available cameras
    const availableCameras = await cameraUtils.getCameraList();
    const targetCamera = availableCameras.find(
      camera => camera.deviceId === deviceId
    );

    if(!targetCamera) {
      throw new Error(
        `Camera device ${deviceId} not found in available ` +
        'cameras'
      );
    }

    try {
      console.log(`Switching camera to: ${targetCamera.label || deviceId}`);

      // Stop current camera
      if(this._stream) {
        cameraUtils.stopCameraStream(this._stream);
        this._stream = null;
      }

      // Create new constraints with specific device ID
      const constraints = cameraUtils.getDefaultConstraints({
        facingMode: undefined, // Remove facingMode when using specific deviceId
        width: 1280,
        height: 720
      });

      // Override with specific device ID
      constraints.video.deviceId = {exact: deviceId};

      console.log('Starting new camera with constraints:', constraints);

      // Start new camera stream
      this._stream = await cameraUtils.startCameraStream(constraints);

      // Update existing video element with new stream
      if(this._videoElement) {
        this._videoElement.srcObject = this._stream;

        // Wait for new video to load
        await new Promise((resolve, reject) => {
          this._videoElement.onloadedmetadata = () => resolve();
          this._videoElement.onerror = () =>
            reject(new Error(
              'Failed to load new camera stream'
            ));
          setTimeout(() => reject(new Error('Camera switch timeout')), 10000);
        });
      }

      // Reset camera state (torch, zoom get reset when switching cameras)
      this._torchState = false;
      this._zoomLevel = 1;

      console.log(
        `Successfully switched to camera: ${
          targetCamera.label || deviceId
        }`
      );
      return this._videoElement;

    } catch(error) {
      console.error('Camera switch error:', error);

      // Try to recover by restarting original camera
      try {
        console.log('Attempting to recover original camera...');
        await this.start(this._container); // Restart with default camera
      } catch(recoveryError) {
        console.error('Failed to recover camera:', recoveryError);
      }

      throw new Error(`Failed to switch camera: ${error.message}`);
    }
  }

  // TODO: scanFile() - Quickly implemented for future use. Need thorough
  // testing.

  /**
  * Scan uploaded files.
  * Delegates to OpticalScanner for file processing.
  *
  * @param {File|File[]} files - The file or array of files to scan.
  * @returns {Promise<object>} A promise that resolves to the formatted
  *  scan result.
  */
  async scanFile(files) {
    if(!files || files.length === 0) {
      throw new Error('No files provided for scanning');
    }

    if(!this._opticalScanner) {
      throw new Error(
        'Scanner not initialized. ' +
        'Create CameraScanner instance first.'
      );
    }

    try {
      // Convert single file to array for consistent processing
      const fileArray = Array.isArray(files) ? files : [files];

      console.log(
        `Starting file scan - Files: ${fileArray.length}, ` +
        `Type: ${this.config.scanType}`
      );

      // Get formats for current scan type
      const formats = this._getFormats(this.config.scanType);

      // Build plugin options for file scanning (similar to camera scanning)
      const filePluginOptions = this._buildPluginOptions(
        formats,
        this.config.licenseKey,
        null, // No container needed for file scanning
        'file' // Force file mode for MRZ
      );

      // Scan first file (can be extended to scan all files)
      const file = fileArray[0];
      const results = await this._opticalScanner.scan(file, {
        formats,
        mode: this.config.scanMode,
        pluginOptions: filePluginOptions
      });

      if(results && results.length > 0) {
        // Format the result using existing formatting methods
        const result = this._formatScanResults(results);
        this.emit('result', result);
        return result;
      } else {
        throw new Error('No optical codes found in uploaded file');
      }
    } catch(error) {
      console.error('File scan error:', error);
      const errorMessage = `File scanning failed: ${error.message}`;
      this.emit('error', {
        message: errorMessage,
        code: 'FILE_SCAN_ERROR'
      });
      throw new Error(errorMessage);
    }
  }
}
