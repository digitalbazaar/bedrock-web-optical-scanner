/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {isDebugEnabled} from '../config.js';

const LOG_PREFIX = '[bedrock-web-optical-scanner]';

// Export the debug check so callers can use it inline
export {isDebugEnabled};

/**
 * Create a logger with custom prefix.
 * Preserves line numbers when used with direct console calls.
 *
 * @param {string} prefix - Custom prefix for logs
 *  (e.g., '[Scanner]', '[Camera]').
 * @returns {object} Logger instance with prefix helper.
 *
 * @example
 * import {createLogger, isDebugEnabled} from './utils/logger.js';
 * const logger = createLogger('[MyModule]');
 *
 * // Preserves line numbers:
 * isDebugEnabled() && console.log(...logger.prefix('Debug message'));
 *
 * // Warnings (always shown):
 * console.warn(...logger.prefix('Warning message'));
 */
export function createLogger(prefix = LOG_PREFIX) {
  return {
    /**
    * Get prefixed arguments for manual console logging.
    * Preserves line numbers when used with console directly.
    *
    * @param {...any} args - Arguments to prefix.
    * @returns {Array} Prefixed arguments.
    */
    prefix(...args) {
      return [prefix, ...args];
    }
  };
}

// Usage
// import {logger, isDebugEnabled} from './utils/logger.js';.
// isDebugEnabled() && console.log(...logger.prefix('Message'));
export const logger = createLogger(LOG_PREFIX);
