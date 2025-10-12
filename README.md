# bedrock-web-optical-scanner

Framework-agnostic optical scanner library for Bedrock apps. Supports QR code, PDF417 barcodes,
and extensible plugin architecture for additional formats.

## Project Overview

`bedrock-web-optical-scanner` project is a browser-based optical scanner library, supporting
QR code and PDF417 barcode formats. The library features a plugin-based architecture that
allows you to easily add support for new formats and scanning modes.

## Features

- **Multi-format scanning**: Built-in support for QR codes, PDF417 barcodes, and MRZ format
- **High performance**: 12-16 fps frame-accurate scanning with video sources (30x-40x faster than polling)
- **Intelligent fallback**: Automatic polling for non-video sources (universal compatibility)
- **Flexible scanning modes**: First match, all formats, or exhaustive scanning
- **Plugin architecture**: Easily extend with custom format scanners
- **Camera utilities**: Helper functions for camera access and video handling
- **Enhanced error context**: Rich error messages with frame counts, scan method, and abort reason
- **Framework agnostic**: Works with any JavaScript framework or vanilla JS
- **Web Worker ready**: Architecture prepared for future threading support

## Performance

### Frame-Accurate Scanning

The scanner uses `requestVideoFrameCallback()` for optimal performance with video sources:

- **12-16 fps** scanning rate (matches video frame rate)
- **< 0.5 seconds** average detection time
- **30x-40x faster** than polling-based approaches
- **Near-instant** barcode detection for responsive UX

### Scanning Strategies

The library automatically selects the optimal strategy based on source type:

| Source Type | Method | Performance | Use Case |
|-------------|--------|-------------|----------|
| HTMLVideoElement | `requestVideoFrameCallback()` | 12-16 fps | Real-time camera scanning (optimal) |
| Other sources | `setTimeout()` polling | 0.4 fps | Fallback for compatibility |

**How it works:**

```javascript
// Automatic routing - no configuration needed
if (source instanceof HTMLVideoElement) {
  // Fast path: Frame-accurate scanning
  // Scans every video frame (12-16 fps)
  await _scanContinuousFrameCallback(video, options);
} else {
  // Fallback: Polling-based scanning
  // Scans every 2.5 seconds (0.4 fps)
  await _scanContinuousPolling(source, options);
}
```

### Performance Metrics

Comparison of polling vs frame-accurate approaches:

| Metric | Polling (Old) | Frame-Accurate (New) | Improvement |
|--------|---------------|----------------------|-------------|
| Scan Rate | 0.4 fps | 12-16 fps | **30x-40x faster** |
| Detection Time | 2.5-7.5s | < 0.5s | **15x faster** |
| Frame Interval | 2500ms | 16-33ms | **98% reduction** |
| User Experience | Laggy, frustrating | Instant, smooth | **Significantly improved** |

**Technical Details:**

- Frame-accurate scanning synchronizes with video frames for minimal latency
- Polling fallback ensures universal compatibility with all source types
- Automatic routing based on source type (no developer configuration needed)
- See `lib/optical-scanner.js` lines 170-380 for implementation details

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

- Exports the `OpticalScanner` class - core scanning engine.
- Handles scanning from images/video/files using registered plugins.
- Implements two continuous scanning strategies:
  - **Frame-accurate:** 12-16 fps using `requestVideoFrameCallback()` (optimal)
  - **Polling fallback:** 0.4 fps using `setTimeout()` (compatibility)
- Automatically routes to best strategy based on source type.
- Provides rich error context (frame counts, scan method, abort reason).
- Accepts plugins for different barcode formats.

### `lib/plugins/`

- `index.js`: Exports plugin registration helpers and plugins.

### `lib/utils/camera.js`

- Camera-related utilities (e.g., starting/stopping streams, capturing frames).

### `manual-test.html`

- UI for manual browser testing.
- Loads the Webpack bundle (`dist/bundle.js`).
- Provides controls for camera and file scanning, displays results, supported formats, and debug info.

## Architecture Principle

- The web module handles all scanning complexities, while framework modules (Vue, React, etc.) focus purely 
on UI concerns and user interactions.

## Plugin Architecture

- Plugins are registered with the scanner to support different barcode formats.
- Each plugin implements detection and decoding logic for its format.
- The scanner can be extended with new plugins for additional formats.

- How to use/consume plugin architecture flow will look like:

Vue (UI Only) -> CameraScanner (Business Logic) -> OpticalScanner (Core Engine) -> Plugins (Format-Specific)

## Core Classes

`lib/opitcal-scanner.js`

- Core scanning engine - handles the actual scanning process
- Plugin architecture - manages format-specific plugins
- Async API - provides async scanning with different resolution modes:
  - 'first' - resolves on first successful scan
  - 'all' - resolves when all formats found
  - 'exhaustive' - lets all plugins complete their attempts
- Format-agnostic - doesn't know about specific barcode types
- Source-flexible - can scan from image, video, canvas, or ImageData

`lib/camera-scanner.js`

- High-level API for framework integration
- Business logic orchestration - combines camera + scanning
- Configuration management - handles scan types ('mrz', 'barcode', 'auto')
- Camera lifecycle - manages camera start/stop
- Plugin configuration - automatically configures plugins based on scan type
- State management - tracks torch, zoom, camera state
- Error handling - provides user-friendly error messages
- File scanning - handles uploaded files vs camera input

## Continuous Scanning Architecture

### Overview

The `OpticalScanner` class implements two strategies for continuous scanning, automatically selecting the optimal approach based on source type.

### Strategy 1: Frame-Accurate Scanning (Optimal)

**Method:** `_scanContinuousFrameCallback()` originally logic from (`bedrock-vue-barcode-scanner` library):

**When used:** Automatically selected for `HTMLVideoElement` sources

**Performance:**

- **12-16 scans per second** (matches video frame rate)
- **16-33ms between scans** (near-instant detection)
- **Optimal for:** Real-time camera barcode scanning

**How it works:**

```javascript
// Uses requestVideoFrameCallback for frame synchronization
video.requestVideoFrameCallback(() => {
  // Scan current video frame
  const results = await this.scan(video, options);
  if (results.length > 0) {
    return results; // Found barcode - done!
  }
  // No results - try next frame
  video.requestVideoFrameCallback(scanFrame);
});
```

**Advantages:**

- Scans every video frame (no missed opportunities)
- No artificial delays (maximum responsiveness)
- Efficient resource usage (only scans when new frames available)
- Best possible user experience

### Strategy 2: Polling-Based Scanning (Fallback)

**Method:** `_scanContinuousPolling()`

**When used:** Automatically selected for non-video sources (compatibility)

**Performance:**

- **0.4 scans per second** (every 2.5 seconds)
- **2.5s between scans** (noticeable delay)
- **Used for:** Edge cases, non-video sources

**How it works:**

```javascript
// Uses setTimeout with 2.5 second delays
while (!aborted) {
  const results = await this.scan(source, options);
  if (results.length > 0) {
    return results; // Found barcode - done!
  }
  // No results - wait before next attempt
  await new Promise(resolve => setTimeout(resolve, 2500));
}
```

**When you'd see this:**

- Scanning from canvas elements (rare)
- Scanning from ImageData (rare)
- Fallback for unsupported source types

**Warning:** If developer/user see "Polling fallback" in console, your source isn't optimal for performance.

**Automatic Routing Logic**
The public `scanContinuous()` method automatically routes to the best strategy:

```javascript
async scanContinuous(source, options) {
  // Check source type
  if (source instanceof HTMLVideoElement) {
    // Fast path: 12-16 fps frame-accurate
    console.log('Using frame-callback (optimal)');
    return this._scanContinuousFrameCallback(source, options);
  }
  // Fallback: 0.4 fps polling
  console.warn('Using polling fallback (slower)');
  return this._scanContinuousPolling(source, options);
}
```

## Error Context Enhancement

Helper method: `_createScanError()`

- Adds frame/attempt counts to errors
- Includes scan method used (frame-callback vs polling)
- Provides abort reason (timeout vs cancellation)
- Improves debugging experience

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
