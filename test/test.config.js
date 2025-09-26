/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'url';
import path from 'path';
import '@bedrock/karma';
// import {createRequire} from 'node:module';
// import path from 'node:path';
// const require = createRequire(import.meta.url);

// config.karma.suites['bedrock-web-pouch-edv'] =
//   path.join('web', '**', '*.js');

// config.karma.config.webpack.resolve.fallback.events =
//   require.resolve('events/');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config.karma.suites['bedrock-web-optical-scanner'] =
  path.join('web', '**', '*.js');
config.karma.config.proxies = {
  '/': 'https://localhost:18443/'
};

config.karma.config.proxyValidateSSL = false;
config.karma.config.webpack.resolve = {
  modules: [
    path.resolve(__dirname, '..', 'node_modules'),
    path.resolve(__dirname, 'node_modules'),
  ]
};

// Add test images for scanning
config.karma.config.files.push({
  pattern: 'images/qr_code/**/*.*',
  included: false,
  served: true,
  watched: false
});
config.karma.config.files.push({
  pattern: 'images/pdf417/**/*.*',
  included: false,
  served: true,
  watched: false
});
