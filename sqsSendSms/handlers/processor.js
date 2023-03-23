'use strict'

const snsManager = require('./snsManager');

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
   * Send mail
   * 
   * @param {String} qMessage
   */
  processor.prototype.execute = function (qMessage) {

   

    const msgBody = JSON.parse(qMessage.body);

    if (msgBody.hasOwnProperty('Sender')) {

      switch (msgBody.Sender) {
        case 'aws-sns':
          snsManager.sendSms(msgBody);
          break;
        default:
          console.log('Invalid sender, it must be aws-sns');
          // throw new Error("Invalid sender, it must be aws-sns");
      }
    } else {

      console.log('Sender is missing in msg body, msgBody : ', msgBody);
      //throw new Error("Sender is missing in msg body.");
    }
  };

  return processor;
}());

module.exports = processor.bootstrap();
