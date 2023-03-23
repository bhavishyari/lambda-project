'use strict'

const hasura = require('./hasura');
const SQS = require('./sqs');
const ASYNC = require('async');

/**
 * processor
 * 
 * @class processor
 */
var processor = (function () {

  /**
   * Initialized a new instance of @processor class.
   */
  function processor() { };

  /**
   * Creates a new @processor instance.
   */
  processor.bootstrap = function () {
    return new processor();
  };

  /**
   * execute process
   * 
   * @param {String} qMessage
   */




processor.prototype.execute = async function (event) {

  ASYNC.waterfall([
    function (callback) {
      // get expiring boarding pass records
      hasura.updateExpiredPasses(callback);
    },
    function (data, callback) {
      callback(null, 'success');
    }
  ], function (err, result) {
    if (err) {
      console.log(err);
    }
    
  });


};

return processor;
}());






module.exports = processor.bootstrap();
