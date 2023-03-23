'use strict'

const AWS = require('aws-sdk');
// AWS.config.update({
//   region: 'us-west-2'
// });

const validator = require('./validation');
const hasura = require('./hasura');

/**
 * snsManager
 * 
 * @class snsManager
 */
var snsManager = (function () {

  /**
   * Initialized a new instance of @snsManager class.
   */
  function snsManager() { };

  /**
   * Creates a new @snsManager instance.
   */
  snsManager.bootstrap = function () {
    return new snsManager();
  };

  /**
   * Send SMS
   * 
   * @param {Object} requestBody
   */
  snsManager.prototype.sendSms = async function (requestBody) {


    // Validate msg body
    const errors = validator.smsRequest(requestBody);

    // console.log(requestBody);

    let sendSmsFlag = true;
    if (errors.length === 0) {
      if (requestBody.hasOwnProperty('UserId') && requestBody.UserId) {
        // UserId available, check user settings
        var nSetting = await hasura.getNotificationSetting(requestBody.UserId);
        if (nSetting && nSetting.hasOwnProperty('params') && nSetting.params.hasOwnProperty('sms')) {
          if (nSetting.params.sms === true) {
            sendSmsFlag = true;
          } else {
            sendSmsFlag = false;
          }
        }
      }
    }

    if (errors.length > 0) {
      console.log('invalid sqs message body: ', JSON.stringify(errors));
      throw new Error('invalid sqs message body');
    } else if (sendSmsFlag === true) {

      var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish({
        'Message': requestBody.Message,
        'PhoneNumber': requestBody.PhoneNumber
      }).promise();

      await publishTextPromise
        .then((data) => {
          console.log("SMS sent, MessageID is : " + data.MessageId, ", Mobile number is :", requestBody.PhoneNumber);
        })
        .catch((err) => {
          console.log("SMS fail, MessageID is : " + data.MessageId, ", Mobile number is :", requestBody.PhoneNumber);
          console.log("error while sending SMS : ", err);
          
          // throw new Error(err.message);
        });

    } else {
      console.log('sms notification is disabled by user');
    }

  };

  return snsManager;
}());

module.exports = snsManager.bootstrap();
