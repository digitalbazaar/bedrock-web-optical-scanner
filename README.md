# bedrock-web-optical-scanner

Framework-agnostic optical scanner library for Bedrock apps. Supports QR code, PDF417 barcodes,
and extensible plugin architecture for additional formats.

## Project Overview

`bedrock-web-optical-scanner` project is a browser-based optical scanner library, supporting
QR code and PDF417 barcode formats. The library features a plugin-based architecture that
allows you to easily add support for new formats and scanning modes.

## Features

- **Multi-format scanning**: Built-in support for QR codes, PDF417 barcodes, and MRZ format
- **Flexible scanning modes**: First match, all formats, or exhaustive scanning
- **Plugin architecture**: Easily extend with custom format scanners
- **Camera utilities**: Helper functions for camera access and video handling
- **Framework agnostic**: Works with any JavaScript framework or vanilla JS
- **Web Worker ready**: Architecture prepared for future threading support

## Directory & File Structure

```
lib/
  camera-scanner.js // Camera Scanner class
  optical-scanner.js // Optical scanner class
  plugins/
    index.js // Plugin registration
    enhancedpdf417Plugin.js // Enhanced PDF417 plugin using Dynamsoft
    mrzPlugin.js // mrz plugin using Dynamsoft
    pdf417Plugin.js // PDF417 plugin
    qrCodePlugin.js // QR code plugin
  utils/
    camera.js // Camera utilities

scripts/
  validate-basic.js // Script for basic validation

test/
  helpers.js, mockData.js, setup-test-images.js, test.js, test.config.js
  images/ // Test images for QR and PDF417
  web/ // Web test helpers

manual-test.html // Browser UI for manual testing
index.js // Main entry, exports, and browser test logic
webpack.config.js // Webpack config for bundling
package.json // Project metadata and dependencies
README.md, LICENSE.md, etc.  // Documentation and legal
```

## Installation

```bash
npm install @bedrock/web-optical-scanner
```

## Scanning Modes

The scanner supports three different resolution strategies:

### 'first' Mode (Default)

Resolves as soon as any plugin successfully scans the requested formats. This is the suitable for most use cases where you want quick results.

### 'all' Mode  

Waits for results from all requested formats before resolving. Useful when you need to scan
multiple format types simultaneously and want results from each.

### 'exhaustive' Mode

Waits for every plugin to complete its scanning attempt, regardless of whether earlier plugins
succeeded. This is the most thorough option but potentially slower.

```javascript
// Example usage
const results = await scanner.scan(image, {
  formats: ['qr_code', 'pdf417', 'pdf417_enhanced'],
  mode: 'first' // or 'all' or 'exhaustive'
});
```

## Main Components

### `lib/camera-scanner.js`

- Exports the `CameraScanner` class - a high-level camera scanner that provides a simple API for framework integration.
- Handles all scanning complexities internally by delegating scan operations to OpticalScanner class - frameworks just handle UI.
- Extends EventEmitter for real-time scanning events and status updates.
- Supports multiple scan types: `'mrz'` (passport/ID documents), `'barcode'` (QR/PDF417), and `'auto'` (all formats).
- Manages camera lifecycle, plugin configuration, and provides built-in timeout handling.
- Designed for easy integration with Vue, React, or any JavaScript framework.

### `lib/optical-scanner.js`

- Exports the `OpticalScanner` class.
- Handles scanning images/files for barcodes using registered plugins.
- Accepts plugins for different barcode formats.

### `lib/plugins/`

- `index.js`: Exports plugin registration helpers and plugins.

### `lib/utils/camera.js`

- Camera-related utilities (e.g., starting/stopping streams, capturing frames).

### `manual-test.html`

- UI for manual browser testing.
- Loads the Webpack bundle (`dist/bundle.js`).
- Provides controls for camera and file scanning, displays results, supported formats, and debug info.

## Plugin Architecture

- Plugins are registered with the scanner to support different barcode formats.
- Each plugin implements detection and decoding logic for its format.
- The scanner can be extended with new plugins for additional formats.

- How to use/consume plugin architecture flow will look like:

Vue (UI Only) -> CameraScanner (Business Logic) -> OpticalScanner (Core Engine) -> Plugins (Format-Specific)

## Plugin Development

Create custom plugins to support additional formats:

```javascript
import { createPlugin } from '@bedrock/web-optical-scanner';

const myCustomPlugin = createPlugin('my_format', async (source, options) => {
  // Implement your scanning logic
  const results = await customScanFunction(source, options);
  
  // Return array of results in standard format
  return results.map(result => ({
    text: result.data,
    format: 'my_format',
    boundingBox: result.bounds,
    confidence: result.confidence
  }));
});

// Register with scanner
scanner.registerPlugin(myCustomPlugin);
```

### Plugin Interface

Plugins must implement:

- `format`: `string` - Unique format identifier
- `scan`: `async function(source, options)` - Scanning function

The scan function should:

- Accept the same source types as the main scanner
- Return an array of result objects
- Handle `AbortSignal` for cancellation
- Throw errors for scan failures

---

## Testing & Validation

- Manual browser testing: Use `manual-test.html` to test scanning via camera or file upload.
- Automated tests: Located in the `test/` directory, using sample images and helpers.

## Known Issues

- Core MRZ scanning functionality is working with successful passport/ID
document extraction. Known issues with UI display in manual-test.html formatting
and plugin configuration are to be addressed in follow-up updates/commits.
- Add more test case scenarios

## Browser Testing

For comprehensive browser testing with live camera and file upload capabilities, see
the [Manual Testing Guide](MANUAL_TESTING.md).

```bash
npm run build
# Then open manual-test.html in your browser
```

## Reference Implementation: Vue Framework Example

TBD

## Troubleshooting

TBD

## Contributing

TBD

## License

TBD
