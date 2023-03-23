'use strict'

require('dotenv').config();
const processor = require('./handlers/processor');

/**
 * scheduled job handler function
 * rate(2 hours)
 *
 * @param {Object} event 
 * @param {Object} context 
 */
module.exports.handler = function (event, context) {

  processor.execute(event);

  return {};
}
