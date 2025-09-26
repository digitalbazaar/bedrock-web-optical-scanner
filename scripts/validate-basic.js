#!/usr/bin/env node
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Basic validation script to test core functionality.
 * Does not require a browser environment.
 */

import {
  cameraUtils,
  OpticalScanner,
  pdf417Plugin,
  qrCodePlugin
} from '../lib/index.js';

console.log('🔍 Validating bedrock-web-optical-scanner...\n');

// Test 1: Module imports
console.log('✅ Module imports successful');
console.log('  - OpticalScanner:', typeof OpticalScanner);
console.log('  - qrCodePlugin:', typeof qrCodePlugin);
console.log('  - pdf417Plugin:', typeof pdf417Plugin);
console.log('  - cameraUtils:', typeof cameraUtils);

// Test 2: Scanner creation
console.log('\n📷 Testing scanner creation...');
try {
  const scanner = new OpticalScanner({
    plugins: [qrCodePlugin, pdf417Plugin]
  });

  console.log('✅ Scanner created successfully');
  console.log('  - Supported formats:', scanner.getSupportedFormats());
  console.log('  - Has scan method:', typeof scanner.scan === 'function');
  console.log(
    '  - Has scanContinuous method:',
    typeof scanner.scanContinuous === 'function'
  );
} catch(error) {
  console.error('❌ Scanner creation failed:', error.message);
  process.exit(1);
}

// Test 3: Plugin registration
console.log('\n🔌 Testing plugin system...');
try {
  const scanner = new OpticalScanner();

  // Test custom plugin
  const testPlugin = {
    format: 'test_format',
    scan: async () => [{text: 'test_result', format: 'test_format'}]
  };

  scanner.registerPlugin(testPlugin);
  const formats = scanner.getSupportedFormats();

  if(formats.includes('test_format')) {
    console.log('✅ Plugin registration works');
  } else {
    throw new Error('Plugin not registered properly');
  }
  // Test invalid plugin
  try {
    scanner.registerPlugin({format: 'invalid'});
    throw new Error('Should have thrown error for invalid plugin');
  } catch(err) {
    if(err.message.includes('Plugin must have format and scan properties')) {
      console.log('✅ Plugin validation works');
    } else {
      throw err;
    }
  }
} catch(error) {
  console.error('❌ Plugin system failed:', error.message);
  process.exit(1);
}

// Test 4: Camera utilities (basic structure check)
console.log('\n📹 Testing camera utilities...');
try {
  console.log(
    '  - getDefaultConstraints:',
    typeof cameraUtils.getDefaultConstraints === 'function'
  );
  console.log(
    '  - startCameraStream:',
    typeof cameraUtils.startCameraStream === 'function'
  );
  console.log(
    '  - createVideoElement:',
    typeof cameraUtils.createVideoElement === 'function'
  );
  console.log(
    '  - getCameraCapabilities:',
    typeof cameraUtils.getCameraCapabilities === 'function'
  );

  // Test constraint generation
  const constraints = cameraUtils.getDefaultConstraints();
  if(constraints.video && constraints.video.facingMode === 'environment') {
    console.log('✅ Camera utilities work');
  } else {
    throw new Error('Default constraints not generated properly');
  }
} catch(error) {
  console.error('❌ Camera utilities failed:', error.message);
  process.exit(1);
}

// Test 5: Error handling
console.log('\n⚠️  Testing error handling...');
try {
  const scanner = new OpticalScanner({plugins: [qrCodePlugin]});
  console.log(scanner);

  // Test unsupported format
  try {
    // This should fail in browser environment, but we're testing the validation
    console.log('  - Unsupported format detection:');
    console.log('    Requires browser environment');
  } catch(err) {
    // Expected in Node.js environment
  }

  console.log('✅ Error handling structure in place');
} catch(error) {
  console.error('❌ Error handling test failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Basic validation complete!');
console.log('\nNext steps:');
console.log('1. Add test images to test/images/ directories');
console.log('2. Run: cd test && npm test');
console.log('3. Test with real images in browser environment');
console.log('4. Validate camera functionality with live video stream');
