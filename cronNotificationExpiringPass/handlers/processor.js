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
  processor.prototype.execute = function (event) {

    ASYNC.waterfall([
      function (callback) {
        // get expiring boarding pass records
        hasura.getExpiringPasses(callback);
      },
      function (expPasses, callback) {

        // send sqs message for each expired pass
        ASYNC.eachLimit(expPasses, 5, function (pass, callback_1) {
          SQS.sendMessage(pass, callback_1);
        }, function (err) {
          if (err) {
            console.log(err);
            callback(null, 'fail');
          } else {
            callback(null, 'success');
          }
        });

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
