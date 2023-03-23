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
   * Send boarding pass email
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendBoardingPassMail = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 5,
      'MessageBody': JSON.stringify({
        "UserId": data.UserId,
        "Sender": "aws-ses",
        "Source": data.Source,
        "Template": "BoardingPassToRider",
        "ConfigurationSetName": "ConfigSet",
        "ToAddresses": data.ToAddresses,
        "TemplateData": data.TemplateData
      }),
      'QueueUrl': process.env.SQS_SEND_MAIL
    }).promise();
  };

  /**
   * Send boarding pass sms
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendBoardingPassSms = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 3,
      'MessageBody': JSON.stringify({
        'UserId': data.UserId,
        'Sender': "aws-sns",
        'Message': data.Message,
        'PhoneNumber': data.PhoneNumber
      }),
      'QueueUrl': process.env.SQS_SEND_SMS
    }).promise();

  };

  /**
   * Send boarding pass push notification
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendBoardingPassPush = function (data) {

    return SQS.sendMessage({
      'DelaySeconds': 3,
      'MessageBody': JSON.stringify(data),
      'QueueUrl': process.env.SQS_SEND_PUSH
    }).promise();

  };

  return sqs;
}());

module.exports = sqs.bootstrap();
