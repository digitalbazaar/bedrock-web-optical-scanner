<template>
  <div class="container">
    <div class="header">
      <h1>🔍 Optical Scanner Demo</h1>
      <p>Testing the bedrock-web-optical-scanner library in Vue</p>
    </div>
    <div class="status" :class="statusType">{{ status }}</div>
    <div class="test-section">
      <h3>📁 File Upload Scanning</h3>
      <input type="file" @change="onFileChange" class="file-input" />
      <button class="btn primary" @click="scanFile" :disabled="!file">Scan File</button>
      <div class="results" v-if="results">{{ results }}</div>
    </div>
    <div class="test-section">
      <h3>📷 Camera Scanning</h3>
      <button class="btn primary" @click="startCamera" :disabled="cameraActive">Start Camera</button>
      <button class="btn" @click="stopCamera" :disabled="!cameraActive">Stop Camera</button>
      <button class="btn primary" @click="scanCamera" :disabled="!cameraActive">Scan from Camera</button>
      <video ref="video" autoplay playsinline style="width:320px;display:none;margin-top:12px;"></video>
      <div class="results" v-if="cameraResults">{{ cameraResults }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { OpticalScanner, qrCodePlugin, pdf417Plugin } from '@bedrock/web-optical-scanner';

const status = ref('📦 Loading optical scanner library...');
const statusType = ref('loading');
const results = ref('');
const file = ref(null);

const cameraResults = ref('');
const video = ref(null);
const cameraActive = ref(false);
let videoStream = null;

const scanner = new OpticalScanner({
  plugins: [qrCodePlugin, pdf417Plugin]
});

// After scanner is created, update status
status.value = '✅ Scanner library loaded!';
statusType.value = 'success';

function onFileChange(event) {
  file.value = event.target.files[0];
  status.value = 'File selected. Ready to scan.';
  statusType.value = 'loading';
}

async function scanFile() {
  if (!file.value) return;
  status.value = '🔍 Scanning file...';
  statusType.value = 'loading';
  try {
    const scanResults = await scanner.scan(file.value, { formats: ['qr_code', 'pdf417'] });
    results.value = JSON.stringify(scanResults, null, 2);
    status.value = '✅ Scan complete!';
    statusType.value = 'success';
  } catch (error) {
    results.value = '';
    status.value = '❌ Scan error: ' + error.message;
    statusType.value = 'error';
  }
}

async function startCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
    });
    video.value.srcObject = videoStream;
    video.value.style.display = 'block';
    cameraActive.value = true;
    await new Promise(resolve => (video.value.onloadedmetadata = resolve));
    video.value.play();
  } catch (err) {
    cameraResults.value = 'Camera error: ' + err.message;
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  video.value.style.display = 'none';
  video.value.srcObject = null;
  cameraActive.value = false;
}

async function scanCamera() {
  if (!cameraActive.value || !video.value) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.value.videoWidth;
  canvas.height = video.value.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video.value, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const options = { formats: ['qr_code', 'pdf417'], mode: 'first' };
  const results = await scanner.scan(blob, options);
  cameraResults.value = JSON.stringify(results, null, 2);
}

onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 40px auto;
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.header {
  text-align: center;
  margin-bottom: 24px;
}
.status {
  padding: 12px;
  border-radius: 8px;
  margin: 16px 0;
  font-weight: 500;
}
.status.loading { background: #e3f2fd; color: #1565c0; }
.status.success { background: #e8f5e8; color: #2e7d32; }
.status.error { background: #ffebee; color: #c62828; }
.test-section {
  margin: 24px 0;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}
.btn.primary { background: #1976d2; color: white; }
.btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.file-input { margin: 16px 0; }
.results {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  font-family: Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}
</style>