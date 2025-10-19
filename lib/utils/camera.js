/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Camera utilities for optical scanning.
 */

/**
 * Get default camera constraints optimized for optical scanning.
 *
 * @param {object} options - Constraint options.
 * @param {string} options.facingMode - Preferred camera facing mode.
 * @param {number} options.width - Ideal width.
 * @param {number} options.height - Ideal height.
 *
 * @returns {object} MediaStream constraints.
 */
export function getDefaultConstraints({
  facingMode = 'environment',
  width = 1280,
  height = 720
} = {}) {
  return {
    audio: false,
    video: {
      facingMode,
      width: {ideal: width},
      height: {ideal: height}
    }
  };
}

/**
 * Start camera stream with optimized settings for scanning.
 *
 * @param {object} constraints - MediaStream constraints.
 *
 * @returns {Promise<MediaStream>} Camera stream.
 */
export async function startCameraStream(constraints = null) {
  if(!constraints) {
    constraints = getDefaultConstraints();
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch(error) {
    throw new Error(`Failed to access camera: ${error.message}`);
  }
}

/**
 * Get list of available cameras.
 *
 * @returns {Promise<MediaDeviceInfo[]>} Array of camera devices.
 */
export async function getCameraList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch(error) {
    throw new Error(`Failed to enumerate cameras: ${error.message}`);
  }
}

/**
 * Create video element and attach stream.
 *
 * @param {MediaStream} stream - Camera stream.
 * @param {object} options - Video element options.
 * @param {boolean} options.autoplay - Start playing automatically.
 * @param {boolean} options.muted - Mute audio.
 * @param {boolean} options.playsInline - Play inline on mobile.
 *
 * @returns {Promise<HTMLVideoElement>} Video element ready for use.
 */
export async function createVideoElement(stream, {
  autoplay = true,
  muted = true,
  playsInline = true
} = {}) {
  const video = document.createElement('video');

  // Set video properties
  video.autoplay = autoplay;
  video.muted = muted;
  video.playsInline = playsInline;

  // Attach stream
  video.srcObject = stream;

  // Wait for metadata to load
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video'));
  });

  return video;
}

/**
 * Stop camera stream and clean up.
 *
 * @param {MediaStream} stream - Stream to stop.
 */
export function stopCameraStream(stream) {
  if(stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Get camera capabilities for advanced features.
 *
 * @param {MediaStream} stream - Active camera stream.
 *
 * @returns {object} Camera capabilities.
 */
export function getCameraCapabilities(stream) {
  if(!stream) {
    return {zoom: false, torch: false};
  }

  const track = stream.getVideoTracks()[0];
  if(!track) {
    return {zoom: false, torch: false};
  }

  const capabilities = track.getCapabilities();
  return {
    zoom: !!capabilities.zoom,
    torch: !!capabilities.torch,
    zoomRange: capabilities.zoom || null
  };
}

/**
 * Apply camera constraints (zoom, torch, etc.).
 *
 * @param {MediaStream} stream - Active camera stream.
 * @param {object} constraints - Constraints to apply.
 * @param {number} constraints.zoom - Zoom level.
 * @param {boolean} constraints.torch - Torch on/off.
 *
 * @returns {Promise<void>}
 */
export async function applyCameraConstraints(stream, constraints) {
  if(!stream) {
    throw new Error('No active stream');
  }

  const track = stream.getVideoTracks()[0];
  if(!track) {
    throw new Error('No video track found');
  }

  const advanced = [];

  if(typeof constraints.zoom === 'number') {
    advanced.push({zoom: constraints.zoom});
  }

  if(typeof constraints.torch === 'boolean') {
    advanced.push({torch: constraints.torch});
  }

  if(advanced.length > 0) {
    await track.applyConstraints({advanced});
  }
}
