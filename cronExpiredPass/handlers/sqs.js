'use strict'

const AWS = require('aws-sdk');


const SQS = new AWS.SQS({
  apiVersion: '2012-11-05'
});

/**
 * sqs
 * 
 * @class sqs
 */
var sqs = (function () {

  /**
   * Initialized a new instance of @sqs class.
   */
  function sqs() { };

  /**
   * Creates a new @sqs instance.
   */
  sqs.bootstrap = function () {
    return new sqs();
  };

  /**
   * Send message to SQS queue
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendMessage = function (data, next) {
    SQS.sendMessage({
      'DelaySeconds': 5,
      'MessageBody': JSON.stringify(data),
      'QueueUrl': process.env.SQS_EXPIRED_PASS
    })
      .promise()
      .then((res) => {
        console.log('sqs message sent : ', res);
        next();
      })
      .catch((err) => {
        //console.log(err);
        next(err);
      });
  };

  return sqs;
}());

module.exports = sqs.bootstrap();
