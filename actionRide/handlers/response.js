'use strict'

const ApiBuilder = require('claudia-api-builder');

/**
 * response
 * 
 * @class response
 */
var response = (function () {

  /**
   * Initialized a new instance of @response class.
   */
  function response() {
  };

  /**
   * Creates a new @response instance.
   */
  response.bootstrap = function () {
    return new response();
  };

  /**
   * Validation error response
   * 
   * @param {Object} errors
   */
  response.prototype.validationError = function (errors) {

    return new ApiBuilder.ApiResponse(
      {
        error: 'BadRequest',
        description: 'Unable to understand request',
        debug: {
          status: 'error',
          code: 400,
          message: 'Validation error',
          errors: errors
        }
      },
      { 'Content-Type': 'application/json' },
      400
    );
  };

  /**
   * Validation error response
   * 
   * @param {Object} errors
   */
  response.prototype.error400 = function (msg) {

    return new ApiBuilder.ApiResponse(
      {
        error: 'ServerError',
        message: msg
      },
      { 'Content-Type': 'application/json' },
      400
    );
  };

  /**
   * Not found Error response
   * 
   * @param {Object} error
   */
  response.prototype.notFoundError = function (error) {
    return new ApiBuilder.ApiResponse(
      {
        error: 'notFoundError',
        description: 'Record not found',
        debug: {
          status: 'error',
          code: 404,
          message: 'Record not found',
          errors: [error]
        }
      },
      { 'Content-Type': 'application/json' },
      404
    );
  };

  /**
   * Server error response
   */
  response.prototype.serverError = function (error) {
    return new ApiBuilder.ApiResponse(
      {
        error: 'InternalServerError',
        description: 'Internal server error',
        debug: {
          status: 'error',
          code: 500,
          message: 'Internal server error',
          errors: [error]
        }
      },
      { 'Content-Type': 'application/json' },
      500
    );
  };

  /**
   * Authorize error response
   * 
   * @param {Object} error
   */
  response.prototype.authError = function (error) {

    return new ApiBuilder.ApiResponse(
      {
        error: 'AuthorizationError',
        description: 'Authorization error',
        debug: {
          status: 'error',
          code: 403,
          message: 'Authorization error',
          errors: [error]
        }
      },
      { 'Content-Type': 'application/json' },
      403
    );
  };

  /**
   * Objtct Created response
   */
  response.prototype.createdResponse = function (data) {

    return new ApiBuilder.ApiResponse(
      data,
      { 'Content-Type': 'application/json' },
      201
    );
  };

  /**
   * Success response
   */
  response.prototype.successResponse = function (data) {

    return new ApiBuilder.ApiResponse(
      data,
      { 'Content-Type': 'application/json' },
      200
    );
  };

  return response;
}());

module.exports = response.bootstrap();
