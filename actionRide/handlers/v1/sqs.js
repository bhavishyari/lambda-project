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
   * Send rating notification to queue
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendRatingNotification = function (data) {

    return SQS.sendMessage({
      // 'DelaySeconds': 600,
      'MessageBody': JSON.stringify(data),
      'QueueUrl': process.env.SQS_NOTIFICATION_RATING
    }).promise();

  };



  /**
   * Send ride booked push notification
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendPush = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 3,
      'MessageBody': JSON.stringify(data),
      'QueueUrl': process.env.SQS_SEND_PUSH
    }).promise();

  };


  return sqs;
}());

module.exports = sqs.bootstrap();
