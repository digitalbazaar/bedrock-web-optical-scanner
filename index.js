/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

export {OpticalScanner} from './lib/optical-scanner.js';
export {createPlugin, qrCodePlugin, pdf417Plugin} from './lib/plugins/index.js';
export * as cameraUtils from './lib/utils/camera.js';

// Only run manual test logic if loaded in manual-test.html
// (set window.manualTest = true) // in manual-test.html
if(typeof window !== 'undefined' && window.manualTes == true) {
  window.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const statusEl = document.getElementById('status');
    const startCameraBtn = document.getElementById('startCamera');
    const stopCameraBtn = document.getElementById('stopCamera');
    const scanCameraBtn = document.getElementById('scanCamera');
    const videoEl = document.getElementById('video');
    const cameraResultsEl = document.getElementById('cameraResults');
    const fileInput = document.getElementById('fileInput');
    const scanFileBtn = document.getElementById('scanFile');
    const fileResultsEl = document.getElementById('fileResults');
    const formatsListEl = document.getElementById('formatsList');
    const debugInfoEl = document.getElementById('debugInfo');

    let scanner = null;
    let videoStream = null;

    function updateStatus(message, type = 'loading') {
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
    }

    function updateDebugInfo(info) {
      const debugText = typeof info === 'object' ?
        JSON.stringify(info, null, 2) :
        info;
      debugInfoEl.textContent = debugText;
    }

    function displayResults(results, targetEl) {
      targetEl.style.display = 'block';
      targetEl.textContent = JSON.stringify(results, null, 2);
    }

    // Initialize the library
    updateStatus('📦 Loading optical scanner library...');
    scanner = new window.OpticalScannerLib.OpticalScanner({
      plugins: [
        window.OpticalScannerLib.qrCodePlugin,
        window.OpticalScannerLib.pdf417Plugin
      ]
    });

    // Get available formats
    const formats = scanner.getSupportedFormats();
    formatsListEl.innerHTML = '';
    formats.forEach(format => {
      const tag = document.createElement('div');
      tag.className = 'format-tag';
      tag.textContent = format;
      formatsListEl.appendChild(tag);
    });

    updateStatus(
      '✅ Scanner ready! Supported formats: ' +
      formats.join(', '),
      'success'
    );

    updateDebugInfo({
      libraryLoaded: true,
      supportedFormats: formats,
      timestamp: new Date().toISOString()
    });

    startCameraBtn.disabled = false;
    scanFileBtn.disabled = false;

    // Camera logic
    startCameraBtn.addEventListener('click', async () => {
      try {
        updateStatus('📹 Starting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {ideal: 1280},
            height: {ideal: 720},
            facingMode: 'environment'
          }
        });
        videoStream = stream;
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        await new Promise(resolve => {
          videoEl.onloadedmetadata = resolve;
        });
        videoEl.play();
        updateStatus('✅ Camera started', 'success');
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        scanCameraBtn.disabled = false;
      } catch(error) {
        console.error('❌ Camera error:', error);
        updateStatus('❌ Camera error: ' + error.message, 'error');
      }
    });

    stopCameraBtn.addEventListener('click', () => {
      if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
      }
      videoEl.style.display = 'none';
      videoEl.srcObject = null;
      updateStatus('📹 Camera stopped');
      startCameraBtn.disabled = false;
      stopCameraBtn.disabled = true;
      scanCameraBtn.disabled = true;
    });

    scanCameraBtn.addEventListener('click', async () => {
      try {
        updateStatus('🔍 Scanning from camera...');
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0);
        const blob = await new Promise(resolve =>
          canvas.toBlob(resolve, 'image/png')
        );
        const options = {
          formats: ['qr_code', 'pdf417'],
          mode: 'first'
        };
        const results = await scanner.scan(blob, options);
        displayResults(results, cameraResultsEl);
        updateStatus('✅ Scan complete', 'success');
      } catch(error) {
        console.error('❌ Scan error:', error);
        updateStatus('❌ Scan error: ' + error.message, 'error');
        displayResults({error: error.message}, cameraResultsEl);
      }
    });

    scanFileBtn.addEventListener('click', async () => {
      try {
        const file = fileInput.files[0];
        if(!file) {
          updateStatus('❌ Please select a file first', 'error');
          return;
        }
        updateStatus('🔍 Scanning file: ' + file.name);
        const options = {
          formats: ['qr_code', 'pdf417'],
          mode: 'all'
        };
        const results = await scanner.scan(file, options);
        displayResults(results, fileResultsEl);
        updateStatus('✅ File scan complete', 'success');
      } catch(error) {
        console.error('❌ File scan error:', error);
        updateStatus('❌ File scan error: ' + error.message, 'error');
        displayResults({error: error.message}, fileResultsEl);
      }
    });

    window.addEventListener('beforeunload', () => {
      if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    });
  });
}
