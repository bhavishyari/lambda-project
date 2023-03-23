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
   * Send boarding pass sms
   * 
   * @param {Object} data
   * 
   * @returns Promise
   */
  sqs.prototype.sendOtpSms = function (data) {

    // console.log('send sms sqs message body : ',data);
    // {
    //   "Message": "Test message",
    //   "PhoneNumber": "+91xxxxxxxxxx"
    // }

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

  return sqs;
}());

module.exports = sqs.bootstrap();
