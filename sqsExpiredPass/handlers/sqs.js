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
   * Send email
   * Template: PASS_EXPIRING_REMINDER
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendMail = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 1,
      'MessageBody': JSON.stringify({
        "UserId": data.UserId,
        "Sender": "aws-ses",
        "Source": data.Source,
        "Template": "PASS_EXPIRED_REMINDER",
        "ConfigurationSetName": "ConfigSet",
        "ToAddresses": data.ToAddresses,
        "TemplateData": data.TemplateData
      }),
      'QueueUrl': process.env.SQS_SEND_MAIL
    }).promise();
  };


  /**
   * Send push notification
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendPush = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 1,
      'MessageBody': JSON.stringify(data),
      'QueueUrl': process.env.SQS_SEND_PUSH
    }).promise();

  };


  return sqs;
}());

module.exports = sqs.bootstrap();
