# bedrock-web-optical-scanner ChangeLog

## 2.0.0 - 2025-mm-dd

### Added

- **Frame-accurate scanning** using `requestVideoFrameCallback()` for optimal performance
  - 12-16 fps scanning rate (30x-40x faster than polling approach)
  - < 0.5 second average detection time (15x faster)
  - Automatic routing based on source type (HTMLVideoElement vs others)
- Polling fallback method for non-video sources
  - Ensures universal compatibility with all source types
  - Emits warning when using slower fallback path
- Enhanced error messages with scan context
  - Includes frame count for frame-accurate scanning
  - Includes attempt count for polling-based scanning
  - Specifies scan method used (for debugging)
  - Provides abort reason (timeout vs user cancellation)
- Comprehensive architecture documentation in code
  - Detailed comments explaining continuous scanning strategies
  - Performance characteristics for each approach

### Changed

- Refactored `scanContinuous()` method to route by source type
  - Maintains same public API (no breaking changes for consumers)
  - Internal implementation split into two strategies
  - Significantly improved performance for video sources
- Updated error handling to include scan method context
  - Helps developers understand which code path was used
  - Provides actionable debugging information

### Improved

- Continuous scanning performance: 0.4 fps > 12-16 fps (30x-40X improvement)
- Barcode detection time: 2.5-7.5s → < 0.5s (15x improvement)
- User experience: From laggy/frustrating to instant/smooth
- Code maintainability: Separated concerns, cleaner architecture
- Debugging: Rich error messages with frame/attempt counts

### Fixed

- Performance regression from original `bedrock-vue-barcode-scanner` implementation
  - Restored frame-accurate scanning that was lost during refactor
  - Now matches or exceeds original performance


## 1.0.0 - 2025-10-02

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
