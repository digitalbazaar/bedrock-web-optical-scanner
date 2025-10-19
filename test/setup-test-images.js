#!/usr/bin/env node
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Script to set up test image directories.
 * Run this if test images are missing.
 */

import {fileURLToPath} from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📁 Setting up test image directories...');

// Create directories
const qrDir = path.join(__dirname, 'images', 'qr_code');
const pdf417Dir = path.join(__dirname, 'images', 'pdf417');

fs.mkdirSync(qrDir, {recursive: true});
fs.mkdirSync(pdf417Dir, {recursive: true});

console.log('✅ Directories created:');
console.log(`  - ${qrDir}`);
console.log(`  - ${pdf417Dir}`);

console.log('\n⚠️  Note: You need to copy actual test images:');
console.log('  - Copy QR code images to test/images/qr_code/');
console.log('    Expected: 001.gif, 002.png');
console.log('  - Copy PDF417 images to test/images/pdf417/');
console.log('    Expected: 001.png, 002.png');
console.log('\n📋 These should be copied from existing');
console.log('    bedrock-vue-barcode-scanner test images');

// Check if images exist
const expectedImages = [
  'images/qr_code/001.gif',
  'images/qr_code/002.png',
  'images/pdf417/001.png',
  'images/pdf417/002.png'
];

let allExist = true;
expectedImages.forEach(imagePath => {
  const fullPath = path.join(__dirname, imagePath);
  if(!fs.existsSync(fullPath)) {
    console.log(`Missing: ${imagePath}`);
    allExist = false;
  } else {
    console.log(`Found: ${imagePath}`);
  }
});

if(allExist) {
  console.log('\n All test images present! You can run tests.');
} else {
  console.log('\n Copy missing images and run tests again.');
}
