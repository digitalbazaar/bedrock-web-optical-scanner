# scanContinuous Refactor - Frame-Accurate Scanning

## Date

Oct 08, 2025

## Branch

`fix/continuous-scan-performance-regression`

## Objective

Restore frame-accurate scanning performance that was lost during architectural refactoring.

## Problem

Current polling-based implementation scans every 2.5 seconds (~0.4 fps), causing:

- Slow barcode detection (150x slower than original)
- Poor user experience (must hold barcode steady for 2.5+ seconds)
- Missed frames (skips 75-150 frames between scans at 30-60fps)

## Solution

Implement dual-path approach:

1. **Video elements**: Use `requestVideoFrameCallback()` for 30-60fps scanning
2. **Other sources**: Fallback to polling for compatibility

## Original Behavior (bedrock-vue-barcode-scanner)

- Used `requestVideoFrameCallback()` for frame-accurate scanning
- Scanned every video frame (30-60 fps)
- Near-instant barcode detection
- Located in: `bedrock-vue-barcode-scanner/lib/barcodes.js`

## Files Modified

- `lib/optical-scanner.js` - Main refactor

## Files Backed Up

- `BACKUP-scanContinuous-before-refactor.js` - Original implementation

## Impact Analysis

- &#9989; Only affects barcode video scanning path
- &#9989; All other scan types unchanged (MRZ, file uploads, auto mode)
- &#9989; No breaking API changes
- &#9989; Graceful fallback for edge cases

## Testing Required

- [ ] Barcode video scanning (QR + PDF417) - Should be 150x faster
- [ ] MRZ camera mode - Should be unchanged
- [ ] MRZ file/element scanning - Should be unchanged
- [ ] File uploads - Should be unchanged
- [ ] Auto mode - Should be unchanged
- [ ] Timeout/abort functionality - Should work identically
- [ ] Error handling - Should be improved

## Performance Metrics

- **Before**: ~0.4 scans/second (2500ms between attempts)
- **After**: 30-60 scans/second (frame-accurate)
- **Improvement**: 75-150x faster detection
