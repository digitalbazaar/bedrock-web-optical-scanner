# bedrock-web-optical-scanner

Framework-agnostic optical scanner library for Bedrock apps. Supports QR code and PDF417 barcode scanning via plugin architecture.

---

## 1. Project Overview

This project is a browser-based optical scanner library, supporting QR code and PDF417 barcode formats. It provides a plugin-based API for barcode detection and decoding, and includes a manual test UI for browser-based testing.

---

## 2. Key Technologies

- JavaScript (ES Modules)
- Webpack: Bundles code for browser use (UMD format)
- barcode-detector: Used as a ponyfill for browser barcode detection
- Plugin Architecture: Extensible for new barcode formats

---

## 3. Directory & File Structure

```
lib/
  optical-scanner.js         // Main scanner class
  plugins/
    index.js                 // Plugin registration
    pdf417Plugin.js          // PDF417 plugin
    qrCodePlugin.js          // QR code plugin
  utils/
    camera.js                // Camera utilities

scripts/
  validate-basic.js          // Script for basic validation

test/
  helpers.js, mockData.js, setup-test-images.js, test.js, test.config.js
  images/                    // Test images for QR and PDF417
  web/                       // Web test helpers

manual-test.html             // Browser UI for manual testing
index.js                     // Main entry, exports, and browser test logic
webpack.config.js            // Webpack config for bundling
package.json                 // Project metadata and dependencies
README.md, LICENSE.md, etc.  // Documentation and legal
```

---

## 4. Main Components

### `lib/optical-scanner.js`

- Exports the `OpticalScanner` class.
- Handles scanning images/files for barcodes using registered plugins.
- Accepts plugins for different barcode formats.

### `lib/plugins/`

- `qrCodePlugin.js` & `pdf417Plugin.js`: Implement detection/decoding for QR and PDF417 formats.
- `index.js`: Exports plugin registration helpers and plugins.

### `lib/utils/camera.js`

- Camera-related utilities (e.g., starting/stopping streams, capturing frames).

### `index.js`

- Exports core classes and plugins for use in Node and browser.
- Manual test logic for browser:
  - On DOMContentLoaded, initializes the scanner using UMD bundle exports (`window.OpticalScannerLib`).
  - Sets up UI event listeners for camera and file scanning.
  - Displays results and status in the UI.

### `manual-test.html`

- UI for manual browser testing.
- Loads the Webpack bundle (`dist/bundle.js`).
- Provides controls for camera and file scanning, displays results, supported formats, and debug info.

### `webpack.config.js`

- Configures Webpack to bundle the library for browser use.
- Outputs a UMD bundle exposing all exports under `window.OpticalScannerLib`.

---

## 5. How Browser Manual Testing Works

- The browser loads `manual-test.html`, which loads the UMD bundle.
- The bundle exposes all exports under `window.OpticalScannerLib`.
- The manual test logic in `index.js`:
  - Instantiates the scanner with plugins from `window.OpticalScannerLib`.
  - Sets up event listeners for camera start/stop, scan frame, and file upload.
  - Scans images from camera or file, and displays results in the UI.

---

## 6. Plugin Architecture

- Plugins are registered with the scanner to support different barcode formats.
- Each plugin implements detection and decoding logic for its format.
- The scanner can be extended with new plugins for additional formats.

---

## 7. Testing & Validation

- Manual browser testing: Use `manual-test.html` to test scanning via camera or file upload.
- Automated tests: Located in the `test/` directory, using sample images and helpers.

---

## 8. Build & Usage

### Build for browser

```bash
npm run build
```

### Manual test

To manually test the scanner in your browser, see the full guide in [MANUAL_TESTING.md](./MANUAL_TESTING.md).

---

## 9. Reference Implementation: Vue Framework Example

TBD

---

## 10. Troubleshooting

- If you see import errors, check that all plugin exports are present.
- If scanning returns empty data, ensure the barcode is clear and supported.
- For Webpack/browser issues, clear `node_modules` and reinstall.

---

## 11. Contributing

TBD

---

## 12. License

TBD
