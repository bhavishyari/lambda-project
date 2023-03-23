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
  validation.prototype.sesRequest = function (requestBody) {

    const vOption = {
      ignore_whitespace: false
    };
    let errors = [];
    
    if (requestBody.Sender === undefined || V.isEmpty(requestBody.Sender + '', vOption)) {
      errors.push({
        attr: 'Sender',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.Source === undefined || V.isEmpty(requestBody.Source + '', vOption)) {
      errors.push({
        attr: 'Source',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.Template === undefined || V.isEmpty(requestBody.Template + '', vOption)) {
      errors.push({
        attr: 'Template',
        msg: 'attribute is required.'
      });
    }

    if (requestBody.ToAddresses === undefined || V.isEmpty(requestBody.ToAddresses + '', vOption)) {
      errors.push({
        attr: 'ToAddresses',
        msg: 'attribute is required.'
      });
    } else if (!Array.isArray(requestBody.ToAddresses)) {
      errors.push({
        attr: 'ToAddresses',
        msg: 'attribute is invalid, it must be array.'
      });
    } else {
      requestBody.ToAddresses.forEach(val => {
        if (V.isEmail(val) === false) {
          errors.push({
            attr: 'ToAddresses',
            msg: `${val} is not valid email address.`
          });
        }
      });
    }

    if (Array.isArray(requestBody.CcAddresses)) {
      requestBody.CcAddresses.forEach(val => {
        if (V.isEmail(val) === false) {
          errors.push({
            attr: 'CcAddresses',
            msg: `${val} is not valid email address.`
          });
        }
      });
    }

    if (Array.isArray(requestBody.BccAddresses)) {
      requestBody.BccAddresses.forEach(val => {
        if (V.isEmail(val) === false) {
          errors.push({
            attr: 'BccAddresses',
            msg: `${val} is not valid email address.`
          });
        }
      });
    }

    if (requestBody.TemplateData === undefined || V.isEmpty(requestBody.TemplateData + '', vOption)) {
      errors.push({
        attr: 'TemplateData',
        msg: 'attribute is required.'
      });
    }

    return errors;
  };

  return validation;
}());

module.exports = validation.bootstrap();
