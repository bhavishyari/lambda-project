'use strict'

const sesManager = require('./sesManager');

/**
 * mailer
 * 
 * @class mailer
 */
var mailer = (function () {

  /**
   * Initialized a new instance of @mailer class.
   */
  function mailer() {};

  /**
   * Creates a new @mailer instance.
   */
  mailer.bootstrap = function () {
    return new mailer();
  };

  /**
   * Send mail
   * 
   * @param {String} qMessage
   */
  mailer.prototype.execute = function (qMessage) {

    const msgBody = JSON.parse(qMessage.body);
    // console.log()

    if (msgBody.hasOwnProperty('Sender')) {

      switch (msgBody.Sender) {
        case 'aws-ses':
          sesManager.sendMail(msgBody);
          break;
        default:
          console.log('Invalid sender.');
          break;
      }
    } else {

      console.log('Sender is missing in msg body.');
    }
  };

  return mailer;
}());

module.exports = mailer.bootstrap();