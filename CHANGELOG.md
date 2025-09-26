# bedrock-web-optical-scanner ChangeLog

## 1.1.0 - 2025-09-26

### Added

- New `CameraScanner` class for framework-agnostic scanning with unified API
  - Orchestrates video stream management with configurable container strategies
  - Handles continuous scanning with unified result formatting across scan types
  - Centralizes scanning complexity
  - Enables thin framework wrappers by abstracting low-level scanning details
- `createTimeOutController` function in OpticalScanner for better scan timeout management

### Improved

- Enhanced OpticalScanner debugging and timeout handling
  - Comprehensive debug logging for better troubleshooting
  - Updated documentation for improved code clarity
- MRZ plugin structure and debugging capabilities
  - Refactored code structure for improved readability
  - Updated documentation for better maintainability
- Overall separation of UI concerns from scanning logic for better code reusability

### Changed

- **NOTE**: CameraScanner now serves as the primary high-level interface for most scanning use cases
- Improved modularity to support framework-agnostic design patterns

## 1.0.0 - 2025-09-10

### Added

- Initial release of `@bedrock/web-optical-scanner`.
- Framework-agnostic optical scanner library for bedrock apps.
- Core `OpticalScanner` class with async API for scanning various formats from images, video, or other sources.
- Plugin system for extensible scanning formats.
- Built-in plugins for:
  - QR Code scanning (`qrCodePlugin`)
  - PDF417 barcode scanning (`pdf417Plugin`)
  - PDF417 Enhanced barcode scanning using Dynamsoft (`enhancedPdf417Plugin`)
  - MRZ scanning using Dynamsoft (`mrzPlugin`)
- Camera utilities for:
  - Getting default camera constraints
  - Starting camera streams
  - Listing available cameras
- Uses `barcode-detector` ponyfill for cross-browser barcode detection.
- Exports:
  - `OpticalScanner`
  - `createPlugin`
  - `cameraUtils`
