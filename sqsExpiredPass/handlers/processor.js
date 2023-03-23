'use strict'

const hasura = require('./hasura');

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
   * process sqs message
   * 
   * @param {String} qMessage
   */
  processor.prototype.execute = async function (qMessage) {

    const msgBody = JSON.parse(qMessage.body);

    if (msgBody.hasOwnProperty('status') && msgBody.status != "EXPIRED") {

      // update record status to EXPIRED
      console.log('Update record status to EXPIRED : id : ', msgBody.id);
      // console.log('msgBody', msgBody);
      let updateRes = await hasura.updateBoardingPassStatus(msgBody.id);
      console.log('updateRes : affected_rows : ', updateRes);

    } else {

      console.log('status is missing in msg body.');
    }
  };

  return processor;
}());

module.exports = processor.bootstrap();
