'use strict'

const _find = require('lodash.find');
// const RH = require('./../response');
// const JWT = require('./jwt');
const hasura = require('./hasura');
const utility = require('./utility');
const MSG = require('../messages');

/**
 * rideRequest
 * 
 * @class rideRequest
 */
var rideRequest = (function () {

  /**
   * Initialized a new instance of @rideRequest class.
   */
  function rideRequest() {};

  /**
   * Creates a new @rideRequest instance.
   */
  rideRequest.bootstrap = function () {
    return new rideRequest();
  };

  /**
   * accept ride
   * 
   * @param {Object} request
   * 
   * @returns JSON
   */
  rideRequest.prototype.requestCron = async function () {


    try {

      //const currentUserId = body.session_variables['x-hasura-user-id'];
    await hasura.requestCron();


      return {
        statusCode: 200,
        body: JSON.stringify(true)
      }

    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'error'
        })
      };
    }
  };






  return rideRequest;
}());

module.exports = rideRequest.bootstrap();