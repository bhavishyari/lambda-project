'use strict'

const V = require('validator');

/**
 * validation
 * 
 * @class validation
 */
var validation = (function () {

  /**
   * Initialized a new instance of @validation class.
   */
  function validation() {};

  /**
   * Creates a new @validation instance.
   */
  validation.bootstrap = function () {
    return new validation();
  };

  /**
   * Validate ses mail sending message body
   * 
   * @param {Object} requestBody
   * 
   * @returns JSON
   */
  validation.prototype.smsRequest = function (requestBody) {

    const vOption = {
      ignore_whitespace: false
    };
    let errors = [];

    // if (requestBody.UserId === undefined || V.isEmpty(requestBody.UserId + '', vOption)) {
    //   errors.push({
    //     attr: 'UserId',
    //     msg: 'attribute is required.'
    //   });
    // }

    if (requestBody.Sender === undefined || V.isEmpty(requestBody.Sender + '', vOption)) {
      errors.push({
        attr: 'Sender',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.Message === undefined || V.isEmpty(requestBody.Message + '', vOption)) {
      errors.push({
        attr: 'Message',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.PhoneNumber === undefined || V.isEmpty(requestBody.PhoneNumber + '', vOption)) {
      errors.push({
        attr: 'PhoneNumber',
        msg: 'attribute is required.'
      });
    }

    return errors;
  };

  return validation;
}());

module.exports = validation.bootstrap();
