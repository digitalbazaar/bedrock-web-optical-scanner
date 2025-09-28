/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

describe('Module Imports', function() {
  let OpticalScanner;
  let qrCodePlugin;
  let pdf417Plugin;
  let cameraUtils;
  let createPlugin;

  it('should import all required modules', async function() {
    try {
      const imports = await import('@bedrock/web-optical-scanner');

      OpticalScanner = imports.OpticalScanner;
      qrCodePlugin = imports.qrCodePlugin;
      pdf417Plugin = imports.pdf417Plugin;
      cameraUtils = imports.cameraUtils;
      createPlugin = imports.createPlugin;

      should.exist(OpticalScanner);
      should.exist(qrCodePlugin);
      should.exist(pdf417Plugin);
      should.exist(cameraUtils);
      should.exist(createPlugin);

      console.log('✅ All imports successful');
    } catch(error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  });

  it('should have correct plugin structure', function() {
    should.exist(qrCodePlugin);
    qrCodePlugin.should.have.property('format', 'qr_code');
    qrCodePlugin.should.have.property('scan');
    qrCodePlugin.scan.should.be.a('function');

    should.exist(pdf417Plugin);
    pdf417Plugin.should.have.property('format', 'pdf417');
    pdf417Plugin.should.have.property('scan');
    pdf417Plugin.scan.should.be.a('function');
  });

  it('should create OpticalScanner instance', function() {
    const scanner = new OpticalScanner();
    should.exist(scanner);
    scanner.should.be.an('object');
    scanner.getSupportedFormats.should.be.a('function');
  });

  it('should have camera utilities', function() {
    should.exist(cameraUtils);
    // cameraUtils is a module namespace object, so check its properties instead
    cameraUtils.should.have.property('getDefaultConstraints');
    cameraUtils.getDefaultConstraints.should.be.a('function');
    cameraUtils.should.have.property('startCameraStream');
    cameraUtils.startCameraStream.should.be.a('function');
    cameraUtils.should.have.property('createVideoElement');
    cameraUtils.createVideoElement.should.be.a('function');
    cameraUtils.should.have.property('getCameraCapabilities');
    cameraUtils.getCameraCapabilities.should.be.a('function');
  });
});
