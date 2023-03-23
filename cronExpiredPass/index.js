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

  console.log(event,'check event is hit or not')
  processor.execute(event);

  return {};
}
