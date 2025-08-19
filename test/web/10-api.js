/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as helpers from '../helpers.js';
import {
  OpticalScanner,
  pdf417Plugin,
  qrCodePlugin
} from '@bedrock/web-optical-scanner';
import mockData from '../mockData.js';

describe('OpticalScanner API', function() {
  let scanner;

  beforeEach(function() {
    scanner = new OpticalScanner({
      plugins: [qrCodePlugin, pdf417Plugin]
    });
  });

  describe('Basic API', function() {
    it('should create scanner instance', function() {
      should.exist(scanner);
      scanner.should.be.an('object');
      scanner.should.be.instanceOf(OpticalScanner);
    });

    it('should have scan method', function() {
      scanner.scan.should.be.a('function');
    });

    it('should have scanContinuous method', function() {
      scanner.scanContinuous.should.be.a('function');
    });

    it('should list supported formats', function() {
      const formats = scanner.getSupportedFormats();
      formats.should.be.an('array');
      formats.should.include('qr_code');
      formats.should.include('pdf417');
      formats.should.have.length(2);
    });

    it('should have plugins available for import', function() {
      should.exist(qrCodePlugin);
      should.exist(pdf417Plugin);
      qrCodePlugin.should.have.property('format', 'qr_code');
      pdf417Plugin.should.have.property('format', 'pdf417');
      qrCodePlugin.should.have.property('scan');
      pdf417Plugin.should.have.property('scan');
    });
  });

  describe('Plugin Registration', function() {
    it('should register plugins on creation', function() {
      const formats = scanner.getSupportedFormats();
      formats.should.have.length(2);
    });

    it('should register additional plugins', function() {
      const testPlugin = {
        format: 'test_format',
        scan: async () => [{text: 'test'}]
      };

      scanner.registerPlugin(testPlugin);
      scanner.getSupportedFormats().should.include('test_format');
    });

    it('should throw error for invalid plugin', function() {
      (() => {
        scanner.registerPlugin({format: 'test'});
      }).should.throw('Plugin must have format and scan properties');
    });
  });

  describe('QR Code Scanning', function() {
    const pathToBarcodes = '/base/images/qr_code/';
    const imageNames = ['001.gif', '002.png'];

    for(const imageName of imageNames) {
      it(`should scan QR code from ${imageName}`, async function() {
        // Load image
        const imageUrl = pathToBarcodes + imageName;
        let img;

        try {
          img = await helpers.loadImage(imageUrl);
        } catch(error) {
          console.warn(`⚠️  Test image ${imageName} not found, skipping test`);
          this.skip();
          return;
        }

        // Scan for QR codes
        const results = await scanner.scan(img, {
          formats: ['qr_code'],
          mode: 'first'
        });

        // Verify results
        results.should.have.length(1);
        const result = results[0];
        result.should.have.property('format', 'qr_code');
        result.should.have.property('data');
        result.data.should.be.an('array');
        result.data.should.have.length.greaterThan(0);

        // Check expected text
        const expectedText = mockData.qr_code[imageName];
        should.exist(expectedText);
        result.data[0].text.should.equal(expectedText);
      });
    }
  });

  describe('PDF417 Scanning', function() {
    const pathToBarcodes = '/base/images/pdf417/';
    const imageNames = ['001.png', '002.png'];

    for(const imageName of imageNames) {
      it(`should scan PDF417 from ${imageName}`, async function() {
        // Load image
        const imageUrl = pathToBarcodes + imageName;
        let img;

        try {
          img = await helpers.loadImage(imageUrl);
        } catch(error) {
          console.warn(`⚠️  Test image ${imageName} not found, skipping test`);
          this.skip();
          return;
        }

        // Scan for PDF417
        const results = await scanner.scan(img, {
          formats: ['pdf417'],
          mode: 'first'
        });

        // Verify results
        results.should.have.length(1);
        const result = results[0];
        result.should.have.property('format', 'pdf417');
        result.should.have.property('data');
        result.data.should.be.an('array');
        result.data.should.have.length.greaterThan(0);

        // Check expected text
        const expectedText = mockData.pdf417[imageName];
        should.exist(expectedText);
        result.data[0].text.should.equal(expectedText);
      });
    }
  });

  describe('Scan Modes', function() {
    it('should support first mode', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      const results = await scanner.scan(img, {
        formats: ['qr_code'],
        mode: 'first'
      });

      results.should.have.length(1);
      results[0].format.should.equal('qr_code');
    });

    it('should support all mode', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      const results = await scanner.scan(img, {
        formats: ['qr_code', 'pdf417'],
        mode: 'all'
      });

      // Should get at least QR code result
      results.should.have.length.greaterThan(0);
      const qrResult = results.find(r => r.format === 'qr_code');
      should.exist(qrResult);
    });

    it('should throw error for unsupported format', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');

      try {
        await scanner.scan(img, {
          formats: ['unsupported_format']
        });
        should.fail('Should have thrown error');
      } catch(error) {
        error.message.should.include('Unsupported formats');
      }
    });
  });

  describe('Abort Signal', function() {
    it('should respect abort signal', async function() {
      const img = await helpers.loadImage('/base/images/qr_code/001.gif');
      const controller = new AbortController();

      // Abort immediately
      controller.abort();

      try {
        await scanner.scan(img, {
          formats: ['qr_code'],
          signal: controller.signal
        });
        should.fail('Should have thrown AbortError');
      } catch(error) {
        error.name.should.equal('AbortError');
      }
    });
  });
});
