/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';

const cfg = {
  // Third-party scanner configuration
  thirdParty: {
    dynamsoft: {
      // Dynamsoft license key (required for MRZ scanning primarily
      // and enhanced pdf417 scan only)
      // eslint-disable-next-line max-len
      licenseKey: ''
    }
  }
};

// Expose on shared web app config
config.opticalScanner = cfg;

// Export helper for plugins
export function getDynamsoftLicense() {
  return config.opticalScanner?.thirdParty?.dynamsoft?.licenseKey || null;
}
