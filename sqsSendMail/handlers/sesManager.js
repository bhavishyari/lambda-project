'use strict'

const AWS = require('aws-sdk');
// AWS.config.update({
//   region: 'us-west-2'
// });
const ses = new AWS.SES({ apiVersion: "2010-12-01" });
const validator = require('./validation');
const hasura = require('./hasura');

/**
 * sesManager
 * 
 * @class sesManager
 */
var sesManager = (function () {

  /**
   * Initialized a new instance of @sesManager class.
   */
  function sesManager() { };

  /**
   * Creates a new @sesManager instance.
   */
  sesManager.bootstrap = function () {
    return new sesManager();
  };

  /**
   * Send mail
   * 
   * @param {Object} requestBody
   */
  sesManager.prototype.sendMail = async function (requestBody) {

    // console.log(requestBody);

    // Validate msg body
    const errors = validator.sesRequest(requestBody);

    console.log('requestBody : ', requestBody);

    if (errors.length > 0) {

      console.log('INVALID SQS MessageBody: ', JSON.stringify(errors));
      // throw new Error('invalid sqs message body');
    } else {

      // prepare ses mail request
      const params = {
        // "Source": requestBody.Source,
        "Source": (requestBody.Source) ? requestBody.Source : process.env.FROM_EMAIL,
        "Template": requestBody.Template,
        "ConfigurationSetName": requestBody.ConfigurationSetName,
        "Destination": {
          "ToAddresses": requestBody.ToAddresses
        },
        "TemplateData": JSON.stringify(requestBody.TemplateData)
      };

      if (requestBody.CcAddresses && Array.isArray(requestBody.CcAddresses) && requestBody.CcAddresses.length > 0) {
        params['Destination']['CcAddresses'] = requestBody.CcAddresses;
      }
      
      if (requestBody.BccAddresses && Array.isArray(requestBody.BccAddresses) && requestBody.BccAddresses.length > 0) {
        params['Destination']['BccAddresses'] = requestBody.BccAddresses;
      }

      let sendMailFlag = true;
      if (requestBody.hasOwnProperty('UserId') && requestBody.UserId) {
        // UserId available, check user settings
        let nSetting = await hasura.getNotificationSetting(requestBody.UserId);
        // console.log('nSetting : ', nSetting);
        if (nSetting && nSetting.hasOwnProperty('params') && nSetting.params.hasOwnProperty('email')) {
          if (nSetting.params.email === true) {
            sendMailFlag = true;
          } else {
            sendMailFlag = false;
          }
        }
      }

      if (sendMailFlag === true) {
        // send mail
        const sendEmail = ses.sendTemplatedEmail(params).promise();
        sendEmail
          .then(data => {
            console.log('email submitted to SES: ', data);
          })
          .catch(error => {
            console.error('err while sending mail to SES: ', error);
          });
      } else {
        console.log('email notification is disabled by user');
      }
    }
  };

  return sesManager;
}());

module.exports = sesManager.bootstrap();
