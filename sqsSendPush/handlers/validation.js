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
   * Validate request
   * 
   * @param {Object} requestBody
   * 
   * @returns {Array}
   */
  validation.prototype.fcmPushRequest = function (requestBody) {

    const vOption = {
      ignore_whitespace: false
    };
    let errors = [];

    if (requestBody.userId === undefined || V.isEmpty(requestBody.userId + '', vOption)) {
      errors.push({
        attr: 'userId',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.platform === undefined || V.isEmpty(requestBody.platform + '', vOption)) {
      errors.push({
        attr: 'platform',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.notification === undefined || V.isEmpty(requestBody.notification + '', vOption)) {
      errors.push({
        attr: 'notification',
        msg: 'attribute is required.'
      });
    } else {

      if (requestBody.notification.title === undefined || V.isEmpty(requestBody.notification.title + '', vOption)) {
        errors.push({
          attr: 'notification.title',
          msg: 'attribute is required.'
        });
      }

      if (requestBody.notification.body === undefined || V.isEmpty(requestBody.notification.body + '', vOption)) {
        errors.push({
          attr: 'notification.body',
          msg: 'attribute is required.'
        });
      }

    }

    if (requestBody.data === undefined || V.isEmpty(requestBody.data + '', vOption)) {
      errors.push({
        attr: 'data',
        msg: 'attribute is required.'
      });
    } else if (typeof requestBody.data != 'object') {
      errors.push({
        attr: 'data',
        msg: 'attribute is not valid, it must be object.'
      });
    }



    return errors;
  };

  return validation;
}());

module.exports = validation.bootstrap();
