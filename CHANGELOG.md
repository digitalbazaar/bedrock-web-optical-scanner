# bedrock-web-optical-scanner ChangeLog

## 1.0.0 - 2025-08-18

### Added

- Initial release of `@bedrock/web-optical-scanner`.
- Framework-agnostic optical scanner library for bedrock apps.
- Core `OpticalScanner` class with async API for scanning various formats from images, video, or other sources.
- Plugin system for extensible scanning formats.
- Built-in plugins for:
  - QR Code scanning (`qrCodePlugin`)
  - PDF417 barcode scanning (`pdf417Plugin`)
- Camera utilities for:
  - Getting default camera constraints
  - Starting camera streams
  - Listing available cameras
- Uses `barcode-detector` ponyfill for cross-browser barcode detection.
- Exports:
  - `OpticalScanner`
  - `createPlugin`
  - `cameraUtils`
